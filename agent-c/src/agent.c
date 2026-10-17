/**
 * @file agent.c
 *
 * CloudRDR Autonomous Storage Monitoring Agent Daemon in C.
 * Cross-platform, zero runtime dependencies, low memory footprint.
 */
#ifndef _DEFAULT_SOURCE
#define _DEFAULT_SOURCE
#endif
#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>

#ifdef _WIN32
  #include <winsock2.h>
  #include <ws2tcpip.h>
  #include <windows.h>
  #include <direct.h>
  #define sleep_sec(s) Sleep((s) * 1000)
  #define popen _popen
  #define pclose _pclose
#else
  #include <unistd.h>
  #include <sys/types.h>
  #include <sys/socket.h>
  #include <netdb.h>
  #include <dirent.h>
  #include <sys/stat.h>
  #define sleep_sec(s) sleep(s)
#endif

#include "../include/cloudrdr_sha256.h"
#include "../include/cloudrdr_entropy.h"
#include "../include/cloudrdr_canary.h"
#include "../include/cloudrdr_detector.h"
#include "../include/cloudrdr_merkle.h"

#define MAX_PATH_LEN 1024
#define MAX_ENTRIES  4096

typedef struct {
    char path[MAX_PATH_LEN];
    char sha256[CLOUDRDR_SHA256_HEX_SIZE];
    size_t size;
    double entropy;
    bool is_canary;
} file_record_t;

typedef struct {
    char manager_host[256];
    int  manager_port;
    char manager_url[512];
    char bucket[128];
    char watch_dir[MAX_PATH_LEN];
    char agent_id[64];
    char token[128];
    int  interval_sec;
    bool run_once;
    bool verbose;
} agent_config_t;

static void parse_url(const char *url, char *host, int *port) {
    *port = 80;
    const char *p = url;
    if (strncmp(p, "http://", 7) == 0) {
        p += 7;
    } else if (strncmp(p, "https://", 8) == 0) {
        p += 8;
        *port = 443;
    }

    char host_buf[256];
    strncpy(host_buf, p, sizeof(host_buf) - 1);
    host_buf[sizeof(host_buf) - 1] = '\0';

    char *slash = strchr(host_buf, '/');
    if (slash) *slash = '\0';

    char *colon = strchr(host_buf, ':');
    if (colon) {
        *colon = '\0';
        *port = atoi(colon + 1);
    }
    snprintf(host, 256, "%s", host_buf);
}

static int http_post_json(const char *host, int port, const char *endpoint, const char *json_body, char *res_out, size_t max_res) {
#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) return -1;
#endif

    struct hostent *he = gethostbyname(host);
    if (!he) {
#ifdef _WIN32
        WSACleanup();
#endif
        return -2;
    }

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
#ifdef _WIN32
        WSACleanup();
#endif
        return -3;
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons((unsigned short)port);
    memcpy(&addr.sin_addr.s_addr, he->h_addr_list[0], he->h_length);

    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) != 0) {
#ifdef _WIN32
        closesocket(sock);
        WSACleanup();
#else
        close(sock);
#endif
        return -4;
    }

    char req[8192];
    int body_len = (int)strlen(json_body);
    snprintf(req, sizeof(req),
             "POST %s HTTP/1.1\r\n"
             "Host: %s:%d\r\n"
             "Content-Type: application/json\r\n"
             "Content-Length: %d\r\n"
             "Connection: close\r\n"
             "User-Agent: CloudRDR-Agent-C/2.4.0\r\n\r\n"
             "%s",
             endpoint, host, port, body_len, json_body);

    send(sock, req, (int)strlen(req), 0);

    int received = 0;
    int total_bytes = 0;
    char chunk[1024];

    if (res_out && max_res > 0) {
        res_out[0] = '\0';
        while ((received = recv(sock, chunk, sizeof(chunk) - 1, 0)) > 0) {
            if (total_bytes + received < (int)max_res - 1) {
                memcpy(res_out + total_bytes, chunk, received);
                total_bytes += received;
                res_out[total_bytes] = '\0';
            }
        }
    }

#ifdef _WIN32
    closesocket(sock);
    WSACleanup();
#else
    close(sock);
#endif

    return 0;
}

static int send_manager_request(const agent_config_t *cfg, const char *endpoint, const char *json_body, char *res_out, size_t max_res) {
    if (strncmp(cfg->manager_url, "https://", 8) == 0) {
        char cmd[4096];
        char tmp_file[256];
#ifdef _WIN32
        const char *tmp_dir = getenv("TEMP") ? getenv("TEMP") : ".";
        snprintf(tmp_file, sizeof(tmp_file), "%s\\cloudrdr_%u.tmp", tmp_dir, (unsigned)GetCurrentProcessId());
#else
        snprintf(tmp_file, sizeof(tmp_file), "/tmp/cloudrdr_%u.tmp", (unsigned)getpid());
#endif
        FILE *tf = fopen(tmp_file, "wb");
        if (tf) {
            fputs(json_body, tf);
            fclose(tf);
            snprintf(cmd, sizeof(cmd),
                     "curl -s -m 8 -X POST -H \"Content-Type: application/json\" -d @\"%s\" \"%s%s\"",
                     tmp_file, cfg->manager_url, endpoint);
            FILE *fp = popen(cmd, "r");
            if (fp) {
                if (res_out && max_res > 0) {
                    size_t n = fread(res_out, 1, max_res - 1, fp);
                    res_out[n] = '\0';
                }
                pclose(fp);
                unlink(tmp_file);
                return 0;
            }
            unlink(tmp_file);
        }
        return -5;
    }
    return http_post_json(cfg->manager_host, cfg->manager_port, endpoint, json_body, res_out, max_res);
}

static size_t scan_directory_recursive(const char *base_dir, const char *rel_prefix, file_record_t *records, size_t max_records, size_t current_count) {
    char search_path[MAX_PATH_LEN];

#ifdef _WIN32
    snprintf(search_path, sizeof(search_path), "%s\\*.*", base_dir);
    WIN32_FIND_DATAA fd;
    HANDLE hFind = FindFirstFileA(search_path, &fd);
    if (hFind == INVALID_HANDLE_VALUE) return current_count;

    do {
        if (strcmp(fd.cFileName, ".") == 0 || strcmp(fd.cFileName, "..") == 0) continue;

        char full_item[MAX_PATH_LEN];
        snprintf(full_item, sizeof(full_item), "%s\\%s", base_dir, fd.cFileName);

        char rel_item[MAX_PATH_LEN];
        if (rel_prefix[0] != '\0') {
            snprintf(rel_item, sizeof(rel_item), "%s/%s", rel_prefix, fd.cFileName);
        } else {
            snprintf(rel_item, sizeof(rel_item), "%s", fd.cFileName);
        }

        if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
            current_count = scan_directory_recursive(full_item, rel_item, records, max_records, current_count);
        } else {
            if (current_count < max_records) {
                file_record_t *rec = &records[current_count];
                snprintf(rec->path, sizeof(rec->path), "%s", rel_item);

                char hex_hash[CLOUDRDR_SHA256_HEX_SIZE];
                size_t file_sz = 0;
                if (cloudrdr_sha256_file(full_item, hex_hash, &file_sz) == 0) {
                    snprintf(rec->sha256, sizeof(rec->sha256), "%s", hex_hash);
                    rec->size = file_sz;

                    cloudrdr_entropy_result ent_res;
                    if (cloudrdr_analyze_file_entropy(full_item, &ent_res) == 0) {
                        rec->entropy = ent_res.total_entropy;
                    } else {
                        rec->entropy = 0.0;
                    }
                    rec->is_canary = cloudrdr_is_canary_path(rel_item);
                    current_count++;
                }
            }
        }
    } while (FindNextFileA(hFind, &fd) && current_count < max_records);

    FindClose(hFind);
#else
    snprintf(search_path, sizeof(search_path), "%s", base_dir);
    DIR *d = opendir(search_path);
    if (!d) return current_count;

    struct dirent *dir;
    while ((dir = readdir(d)) != NULL && current_count < max_records) {
        if (strcmp(dir->d_name, ".") == 0 || strcmp(dir->d_name, "..") == 0) continue;

        char full_item[MAX_PATH_LEN];
        snprintf(full_item, sizeof(full_item), "%s/%s", base_dir, dir->d_name);

        char rel_item[MAX_PATH_LEN];
        if (rel_prefix[0] != '\0') {
            snprintf(rel_item, sizeof(rel_item), "%s/%s", rel_prefix, dir->d_name);
        } else {
            snprintf(rel_item, sizeof(rel_item), "%s", dir->d_name);
        }

        struct stat st;
        if (stat(full_item, &st) == 0) {
            if (S_ISDIR(st.st_mode)) {
                current_count = scan_directory_recursive(full_item, rel_item, records, max_records, current_count);
            } else if (S_ISREG(st.st_mode)) {
                file_record_t *rec = &records[current_count];
                snprintf(rec->path, sizeof(rec->path), "%s", rel_item);

                char hex_hash[CLOUDRDR_SHA256_HEX_SIZE];
                size_t file_sz = 0;
                if (cloudrdr_sha256_file(full_item, hex_hash, &file_sz) == 0) {
                    snprintf(rec->sha256, sizeof(rec->sha256), "%s", hex_hash);
                    rec->size = file_sz;

                    cloudrdr_entropy_result ent_res;
                    if (cloudrdr_analyze_file_entropy(full_item, &ent_res) == 0) {
                        rec->entropy = ent_res.total_entropy;
                    } else {
                        rec->entropy = 0.0;
                    }
                    rec->is_canary = cloudrdr_is_canary_path(rel_item);
                    current_count++;
                }
            }
        }
    }
    closedir(d);
#endif
    return current_count;
}

static int compare_file_records(const void *a, const void *b) {
    const file_record_t *ra = (const file_record_t *)a;
    const file_record_t *rb = (const file_record_t *)b;
    return strcmp(ra->path, rb->path);
}

int main(int argc, char **argv) {
    setvbuf(stdout, NULL, _IONBF, 0);
    agent_config_t cfg;
    memset(&cfg, 0, sizeof(cfg));

    strncpy(cfg.manager_url, "http://localhost:3000", sizeof(cfg.manager_url) - 1);
    strncpy(cfg.bucket, "protected", sizeof(cfg.bucket) - 1);
    strncpy(cfg.watch_dir, "./data/local-storage", sizeof(cfg.watch_dir) - 1);
    strncpy(cfg.agent_id, "agt-c-native-01", sizeof(cfg.agent_id) - 1);
    cfg.interval_sec = 10;
    cfg.run_once = false;
    cfg.verbose = false;

    /* Read environment variables if available */
    const char *env_mgr = getenv("MANAGER_URL");
    if (env_mgr && env_mgr[0]) strncpy(cfg.manager_url, env_mgr, sizeof(cfg.manager_url) - 1);
    const char *env_bkt = getenv("BUCKET");
    if (env_bkt && env_bkt[0]) strncpy(cfg.bucket, env_bkt, sizeof(cfg.bucket) - 1);
    const char *env_dir = getenv("WATCH_DIR");
    if (env_dir && env_dir[0]) strncpy(cfg.watch_dir, env_dir, sizeof(cfg.watch_dir) - 1);
    const char *env_id = getenv("AGENT_ID");
    if (env_id && env_id[0]) strncpy(cfg.agent_id, env_id, sizeof(cfg.agent_id) - 1);
    const char *env_int = getenv("INTERVAL_SEC");
    if (env_int && env_int[0]) cfg.interval_sec = atoi(env_int);
    const char *env_verb = getenv("VERBOSE");
    if (env_verb && (strcmp(env_verb, "1") == 0 || strcmp(env_verb, "true") == 0)) cfg.verbose = true;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0) {
            printf("Usage: cloudrdr-agent [options]\n");
            printf("Options:\n");
            printf("  --manager <url>    Manager API URL (default: http://localhost:3000)\n");
            printf("  --bucket <name>    Target bucket name (default: protected)\n");
            printf("  --watch <path>     Directory path to monitor (alias: --dir)\n");
            printf("  --dir <path>       Directory path to monitor\n");
            printf("  --interval <sec>   Polling interval in seconds (default: 10)\n");
            printf("  --agent-id <id>    Custom agent identifier\n");
            printf("  --once             Run a single scan cycle and exit\n");
            printf("  --verbose          Enable verbose logging\n");
            printf("  --help, -h         Show this help message\n");
            return 0;
        } else if (strcmp(argv[i], "--manager") == 0 && i + 1 < argc) {
            strncpy(cfg.manager_url, argv[++i], sizeof(cfg.manager_url) - 1);
        } else if (strcmp(argv[i], "--bucket") == 0 && i + 1 < argc) {
            strncpy(cfg.bucket, argv[++i], sizeof(cfg.bucket) - 1);
        } else if ((strcmp(argv[i], "--watch") == 0 || strcmp(argv[i], "--dir") == 0) && i + 1 < argc) {
            strncpy(cfg.watch_dir, argv[++i], sizeof(cfg.watch_dir) - 1);
        } else if (strcmp(argv[i], "--interval") == 0 && i + 1 < argc) {
            cfg.interval_sec = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--agent-id") == 0 && i + 1 < argc) {
            strncpy(cfg.agent_id, argv[++i], sizeof(cfg.agent_id) - 1);
        } else if (strcmp(argv[i], "--once") == 0) {
            cfg.run_once = true;
        } else if (strcmp(argv[i], "--verbose") == 0) {
            cfg.verbose = true;
        }
    }

    parse_url(cfg.manager_url, cfg.manager_host, &cfg.manager_port);

    printf("============================================================\n");
    printf("   CloudRDR High-Performance C Autonomous Monitoring Agent  \n");
    printf("============================================================\n");
    printf("[*] Agent ID:      %s\n", cfg.agent_id);
    printf("[*] Manager URL:   %s (%s:%d)\n", cfg.manager_url, cfg.manager_host, cfg.manager_port);
    printf("[*] Target Bucket: %s\n", cfg.bucket);
    printf("[*] Watch Target:  %s\n", cfg.watch_dir);
    printf("[*] Poll Interval: %ds\n", cfg.interval_sec);
    printf("\n");

    /* Register agent with SOC Manager */
    char reg_payload[2048];
    snprintf(reg_payload, sizeof(reg_payload),
             "{\"agentId\":\"%s\",\"hostname\":\"%s\",\"platform\":\"%s\",\"watchPath\":\"%s\",\"bucket\":\"%s\",\"version\":\"2.4.0-c\"}",
             cfg.agent_id, cfg.agent_id,
#ifdef _WIN32
             "windows",
#else
             "linux",
#endif
             cfg.watch_dir, cfg.bucket);

    char reg_resp[2048];
    printf("[*] Registering with CloudRDR Manager...\n");
    int reg_stat = send_manager_request(&cfg, "/api/agent/register", reg_payload, reg_resp, sizeof(reg_resp));
    if (reg_stat == 0) {
        printf("[+] Agent registered successfully.\n");
    } else {
        printf("[-] Manager connection failed (code %d). Running in autonomous local evaluation mode.\n", reg_stat);
    }

    file_record_t *prev_records = malloc(sizeof(file_record_t) * MAX_ENTRIES);
    file_record_t *current_records = malloc(sizeof(file_record_t) * MAX_ENTRIES);
    const char **hashes = malloc(sizeof(char *) * MAX_ENTRIES);
    if (!prev_records || !current_records || !hashes) {
        fprintf(stderr, "[-] Out of memory\n");
        free(prev_records);
        free(current_records);
        free(hashes);
        return 1;
    }

    size_t prev_count = 0;
    bool has_baseline = false;

    cloudrdr_detector_config det_cfg;
    cloudrdr_detector_config_init(&det_cfg);

    int cycle = 1;
    while (1) {
        printf("\n[*] Cycle #%d: Scanning target storage...\n", cycle++);

        size_t current_count = scan_directory_recursive(cfg.watch_dir, "", current_records, MAX_ENTRIES, 0);
        if (current_count > 1) {
            qsort(current_records, current_count, sizeof(file_record_t), compare_file_records);
        }

        printf("    Objects Indexed: %zu\n", current_count);

        /* Compute Merkle Root of current state */
        if (current_count > 0) {
            for (size_t i = 0; i < current_count; i++) {
                hashes[i] = current_records[i].sha256;
            }
            char merkle_root[CLOUDRDR_SHA256_HEX_SIZE];
            if (cloudrdr_merkle_root(hashes, current_count, merkle_root) == 0) {
                printf("    Merkle Root:     %s\n", merkle_root);
            }
        }

        size_t changed_files = 0;
        bool canary_breached = false;
        size_t high_entropy_files = 0;

        if (has_baseline) {
            for (size_t i = 0; i < current_count; i++) {
                bool found = false;
                for (size_t j = 0; j < prev_count; j++) {
                    if (strcmp(current_records[i].path, prev_records[j].path) == 0) {
                        found = true;
                        if (strcmp(current_records[i].sha256, prev_records[j].sha256) != 0) {
                            changed_files++;
                            if (current_records[i].is_canary) canary_breached = true;
                            if (current_records[i].entropy >= det_cfg.entropy_threshold) high_entropy_files++;
                            if (cfg.verbose) {
                                printf("    [MODIFIED] %s (entropy: %.2f, canary: %s)\n",
                                       current_records[i].path, current_records[i].entropy,
                                       current_records[i].is_canary ? "YES" : "NO");
                            }
                        }
                        break;
                    }
                }
                if (!found) {
                    changed_files++;
                    if (current_records[i].is_canary) canary_breached = true;
                    if (current_records[i].entropy >= det_cfg.entropy_threshold) high_entropy_files++;
                }
            }
        } else {
            has_baseline = true;
        }

        /* Evaluate threat with autonomous C detector engine */
        cloudrdr_evaluation_result eval_res;
        cloudrdr_detector_evaluate(&det_cfg, current_count, changed_files, canary_breached, high_entropy_files, &eval_res);

        printf("    Verdict:         [%s] | Action: [%s]\n",
               cloudrdr_verdict_to_string(eval_res.verdict),
               cloudrdr_action_to_string(eval_res.action));
        printf("    Diagnostic:      %s\n", eval_res.summary);

        /* Send Heartbeat & Telemetry to Manager */
        char hb_payload[1024];
        snprintf(hb_payload, sizeof(hb_payload),
                 "{\"agentId\":\"%s\",\"cpuUsage\":1,\"ramUsageMb\":4,\"filesMonitored\":%zu,\"status\":\"online\"}",
                 cfg.agent_id, current_count);
        char hb_resp[1024];
        send_manager_request(&cfg, "/api/agent/heartbeat", hb_payload, hb_resp, sizeof(hb_resp));

        /* If threat detected, print alert */
        if (eval_res.action == CLOUDRDR_ACTION_FREEZE) {
            printf("\n[!!! ALERT !!!] IMMINENT RANSOMWARE ENCRYPTION DETECTED! TRIGGERING CONTAINMENT LOCK.\n");
        }

        /* Update baseline records */
        memcpy(prev_records, current_records, sizeof(file_record_t) * current_count);
        prev_count = current_count;

        if (cfg.run_once) {
            break;
        }

        sleep_sec(cfg.interval_sec);
    }

    free(prev_records);
    free(current_records);
    free(hashes);
    printf("\n[*] CloudRDR C Agent cycle finished.\n");
    return 0;
}
