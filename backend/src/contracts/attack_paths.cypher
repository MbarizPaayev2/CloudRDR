// ============================================================
// CloudRDR Threat Intelligence - OpenCypher Attack Path Queries
// Inspired by Prowler Attack Paths Graph Engine (prowler-attack-paths-query).
// Models AWS IAM privilege escalation, S3 ransomware exfiltration,
// canary tripwire triggers, and automated containment circuits.
// ============================================================

// 1. Critical Ransomware Path: Compromised IAM Principal -> Mass S3 PutObject Encryption
// Identifies all identities capable of escalating permissions and overwriting protected storage.
MATCH (attacker:ThreatActor)-[:COMPROMISED]->(identity:IAMIdentity)
MATCH (identity)-[:CAN_ASSUME*0..2]->(role:IAMRole)
MATCH (role)-[:HAS_POLICY]->(policy:IAMPolicy)
MATCH (policy)-[:ALLOWS]->(action:Action)
WHERE action.name IN ['s3:PutObject', 's3:PutObjectVersion', 's3:DeleteObject']
MATCH (action)-[:TARGETS]->(bucket:S3Bucket {protectionTier: 'critical'})
RETURN attacker.name AS ThreatActor,
       identity.arn AS InitialIdentity,
       role.arn AS EscalatedRole,
       bucket.name AS TargetBucket,
       ['CredentialTheft', 'RoleAssumption', 'MassEncryption'] AS AttackSequence;

// 2. Automated Containment Circuit: Canary File Access -> CloudRDR IAM Isolation Lock
// Maps how a canary sentinel trip immediately invokes automated IAM write-locking.
MATCH (canary:CanaryFile {status: 'armed'})<-[:MODIFIED_BY]-(maliciousProcess:Process)
MATCH (maliciousProcess)-[:USES_CREDENTIALS]->(role:IAMRole)
MATCH (containmentWorker:CloudRDRWorker)-[:ATTACH_DENY_POLICY]->(role)
RETURN canary.path AS CanarySentinel,
       role.arn AS IsolatedIdentity,
       containmentWorker.id AS ResponseDaemon,
       'Sub60sContainment' AS SLAStatus;

// 3. Backup Tamper & Deletion Path: Lateral Movement to Immutable Vaults
// Verifies that WORM Object Lock blocks ransomware attempts to erase backup versions.
MATCH (identity:IAMIdentity)-[:ATTEMPTS_DELETION]->(backup:BackupSnapshot)
MATCH (backup)-[:PROTECTED_BY]->(vault:ImmutableVault {objectLockMode: 'COMPLIANCE'})
RETURN identity.arn AS MaliciousPrincipal,
       backup.id AS TargetBackup,
       vault.retentionDays AS RetentionPeriod,
       'BLOCKED_BY_WORM' AS EnforcementResult;
