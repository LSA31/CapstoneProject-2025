import os

def print_tree(start_path, indent=""):
    items = os.listdir(start_path)
    for i, item in enumerate(items):
        path = os.path.join(start_path, item)
        connector = "└── " if i == len(items) - 1 else "├── "
        print(indent + connector + item)
        if os.path.isdir(path):
            new_indent = indent + ("    " if i == len(items) - 1 else "│   ")
            print_tree(path, new_indent)

# 현재 폴더 기준
print(".")
print_tree(".")