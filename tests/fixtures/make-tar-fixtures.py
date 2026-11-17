"""Builds the tar fixtures used by tests/tar.test.ts.

Run from the repo root: python3 tests/fixtures/make-tar-fixtures.py
"""
import gzip, io, tarfile

FILES = {
    "repo-main/src/companies/acme.md": b"---\ntitle: Acme\n---\n\n## Company blurb\n\nHi.\n",
    "repo-main/src/companies/" + "a-very-long-company-slug-" * 4 + "end.md": b"long path\n",
    "repo-main/README.md": b"# readme\n",
}

# ustar can't store a single path component over 100 bytes, but splits long
# directory paths into its prefix field.
USTAR_FILES = {
    "repo-main/src/companies/acme.md": FILES["repo-main/src/companies/acme.md"],
    "repo-main/" + "nested-directory/" * 6 + "deep.md": b"prefix path\n",
}

def build(fmt, path, files, global_headers=None):
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=fmt, pax_headers=global_headers or {}) as tar:
        directory = tarfile.TarInfo("repo-main/src/companies")
        directory.type = tarfile.DIRTYPE
        tar.addfile(directory)
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    with open(path, "wb") as out:
        out.write(gzip.compress(raw.getvalue(), mtime=0))

# GitHub serves pax archives with a global header holding the commit id.
build(tarfile.PAX_FORMAT, "tests/fixtures/pax.tar.gz", FILES, {"comment": "0123456789abcdef"})
# ustar splits long paths into the prefix + name fields instead.
build(tarfile.USTAR_FORMAT, "tests/fixtures/ustar.tar.gz", USTAR_FILES)
