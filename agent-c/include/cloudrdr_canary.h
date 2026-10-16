/**
 * @file cloudrdr_canary.h
 *
 * Tripwire Canary Sentinel Detection Engine in C.
 */

#ifndef CLOUDRDR_CANARY_H
#define CLOUDRDR_CANARY_H

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Check if a file or directory path matches designated canary / sentinel patterns.
 * Matches "canary", "canaries", ".canary", "tripwire", etc. (case-insensitive).
 */
bool cloudrdr_is_canary_path(const char *path);

#ifdef __cplusplus
}
#endif

#endif /* CLOUDRDR_CANARY_H */
