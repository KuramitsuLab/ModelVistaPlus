import os
import shutil
from glob import glob

src = "/Users/obarayui/Git/ModelVistaPlus/model/usecase002/image.json"
dst_base = "/Users/obarayui/Git/ModelVistaPlus/model"

for folder in glob(os.path.join(dst_base, "*/")):
    dst_file = os.path.join(folder, "image.json")
    if not os.path.exists(dst_file):
        shutil.copy(src, dst_file)
        print(f"Copied to {dst_file}")
    else:
        print(f"Skipped {dst_file} (already exists)")