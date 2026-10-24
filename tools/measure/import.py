#!/usr/bin/env python3
"""Host import layer: unpack a phone tar export into a new directory without following links."""
import shutil
import sys
import tarfile
from pathlib import Path, PurePosixPath


def main():
    """Treat exported members as files, never executable instructions or archive links."""
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python3 -I tools/measure/import.py EXPORT.tar NEW_DIRECTORY")
    archive_path, destination = map(Path, sys.argv[1:])
    # A fresh destination prevents existing symlinks from redirecting writes.
    destination.mkdir(parents=True, exist_ok=False)
    with tarfile.open(archive_path, "r:*") as archive:
        members = archive.getmembers()
        if len(members) > 512 or sum(m.size for m in members) > 256 * 1024 * 1024:
            raise SystemExit("Export exceeds the expected diagnostic size.")
        for member in members:
            path = PurePosixPath(member.name)
            if path.is_absolute() or ".." in path.parts or not (member.isfile() or member.isdir()):
                raise SystemExit("Export contains an unexpected path or member type.")
        for member in members:
            target = destination.joinpath(*PurePosixPath(member.name).parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is None:
                raise SystemExit("Export member could not be read.")
            with source, target.open("xb") as output:
                shutil.copyfileobj(source, output)
    print(f"Imported diagnostic data to {destination}")


if __name__ == "__main__":
    main()
