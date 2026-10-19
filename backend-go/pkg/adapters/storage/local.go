package storage

import (
	"io"
	"os"
	"path/filepath"
	"strings"
)

type FileEntry struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
}

type LocalStorage struct {
	basePath string
}

func NewLocalStorage(basePath string) *LocalStorage {
	return &LocalStorage{basePath: basePath}
}

func (s *LocalStorage) BasePath() string {
	return s.basePath
}

func (s *LocalStorage) resolve(bucket, relPath string) string {
	cleanRel := filepath.Clean(filepath.ToSlash(relPath))
	cleanRel = strings.TrimPrefix(cleanRel, "/")
	return filepath.Join(s.basePath, bucket, cleanRel)
}

func (s *LocalStorage) List(bucket string) ([]FileEntry, error) {
	bucketDir := filepath.Join(s.basePath, bucket)
	var entries []FileEntry

	if _, err := os.Stat(bucketDir); os.IsNotExist(err) {
		return entries, nil
	}

	err := filepath.Walk(bucketDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		rel, err := filepath.Rel(bucketDir, path)
		if err != nil {
			return nil
		}

		entries = append(entries, FileEntry{
			Path: filepath.ToSlash(rel),
			Size: info.Size(),
		})
		return nil
	})

	return entries, err
}

func (s *LocalStorage) Read(bucket, path string) ([]byte, error) {
	return os.ReadFile(s.resolve(bucket, path))
}

func (s *LocalStorage) Write(bucket, path string, data []byte) error {
	full := s.resolve(bucket, path)
	if err := os.MkdirAll(filepath.Dir(full), 0755); err != nil {
		return err
	}
	return os.WriteFile(full, data, 0644)
}

func (s *LocalStorage) OpenReadStream(bucket, path string) (io.ReadCloser, error) {
	return os.Open(s.resolve(bucket, path))
}
