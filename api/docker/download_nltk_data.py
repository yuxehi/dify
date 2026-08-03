import shutil
import time
import zipfile
from pathlib import Path

import nltk


DOWNLOAD_DIR = Path("/usr/local/share/nltk_data")
MAX_ATTEMPTS = 3
PACKAGES = {
    "punkt": "tokenizers/punkt",
    "averaged_perceptron_tagger": "taggers/averaged_perceptron_tagger",
    "stopwords": "corpora/stopwords",
}


def remove_download(package_path: str) -> None:
    resource_path = DOWNLOAD_DIR / package_path
    shutil.rmtree(resource_path, ignore_errors=True)
    resource_path.with_suffix(".zip").unlink(missing_ok=True)


def verify_download(package_path: str) -> None:
    resource_path = DOWNLOAD_DIR / package_path
    archive_path = resource_path.with_suffix(".zip")

    if not resource_path.is_dir() or not any(resource_path.rglob("*")):
        raise RuntimeError(f"NLTK resource is missing or empty: {package_path}")

    if not archive_path.is_file():
        raise RuntimeError(f"NLTK archive is missing: {archive_path}")

    with zipfile.ZipFile(archive_path) as archive:
        corrupt_member = archive.testzip()
        if corrupt_member is not None:
            raise RuntimeError(f"Corrupt member in {archive_path}: {corrupt_member}")

    nltk.data.find(package_path, paths=[str(DOWNLOAD_DIR)])


def download_with_retry(package: str, package_path: str) -> None:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        remove_download(package_path)
        try:
            downloaded = nltk.download(
                package,
                download_dir=str(DOWNLOAD_DIR),
                force=True,
                halt_on_error=True,
                raise_on_error=True,
            )
            if not downloaded:
                raise RuntimeError(f"nltk.download returned false for {package}")
            verify_download(package_path)
            print(f"Verified NLTK package: {package}")
            return
        except Exception:
            remove_download(package_path)
            if attempt == MAX_ATTEMPTS:
                raise
            print(f"NLTK package {package} failed attempt {attempt}; retrying")
            time.sleep(attempt * 2)


def main() -> None:
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for package, package_path in PACKAGES.items():
        download_with_retry(package, package_path)


if __name__ == "__main__":
    main()
