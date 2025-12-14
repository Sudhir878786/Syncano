
from PIL import Image
import sys

def remove_black_background(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        # Check if the pixel is black or very dark
        if item[0] < 20 and item[1] < 20 and item[2] < 20:
            new_data.append((255, 255, 255, 0))  # Replace with transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

if __name__ == "__main__":
    remove_black_background('/home/gearhead/.gemini/antigravity/brain/f22a9322-61a2-48ea-bc6e-2433d95368ff/melodexa_ultimate_logo_1765705486499.png', '/home/gearhead/Music/train/supreme-pancake/melodexa/static/images/logo.png')
