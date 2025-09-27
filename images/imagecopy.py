import os
import shutil

# 設定：コピー元フォルダ、新しいファイル名
settings = {
    "drawingtool": {
        "src_dir": "images/drawingtool",
        "dst_name": "powerpoint_ja"
    },
    "paper": {
        "src_dir": "images/paper",
        "dst_name": "handwritten_ja"
    },
    "whiteboard": {
        "src_dir": "images/whiteboard",
        "dst_name": "whiteboard_ja"
    }
}

def copy_images(src_dir, dst_name):
    if not os.path.exists(src_dir):
        print(f"コピー元フォルダがありません: {src_dir}")
        return
    for filename in os.listdir(src_dir):
        src_path = os.path.join(src_dir, filename)
        if not os.path.isfile(src_path):
            continue
        name, ext = os.path.splitext(filename)
        dst_dir = os.path.join("model", name)
        dst_path = os.path.join(dst_dir, f"{dst_name}{ext}")
        if os.path.exists(dst_path):
            print(f"既に存在するためスキップ: {dst_path}")
            continue
        os.makedirs(dst_dir, exist_ok=True)
        shutil.copy2(src_path, dst_path)
        print(f"コピーしました: {src_path} → {dst_path}")

if __name__ == "__main__":
    copy_images(settings["whiteboard"]["src_dir"], settings["whiteboard"]["dst_name"])