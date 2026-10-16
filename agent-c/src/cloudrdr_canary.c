/**
 * @file cloudrdr_canary.c
 *
 * Implementation of Canary Sentinel Detection Engine.
 */

#include "../include/cloudrdr_canary.h"
#include <string.h>
#include <ctype.h>

static void str_tolower(const char *src, char *dst, size_t max_len) {
    size_t i = 0;
    while (src[i] != '\0' && i + 1 < max_len) {
        dst[i] = (char)tolower((unsigned char)src[i]);
        i++;
    }
    dst[i] = '\0';
}

bool cloudrdr_is_canary_path(const char *path) {
    if (!path || path[0] == '\0') {
        return false;
    }

    char lower[1024];
    str_tolower(path, lower, sizeof(lower));

    if (strstr(lower, "canary") != NULL ||
        strstr(lower, "canaries") != NULL ||
        strstr(lower, "tripwire") != NULL ||
        strstr(lower, ".sentinel") != NULL) {
        return true;
    }

    return false;
}
