from PIL import Image, ImageDraw

def create_icon(size, path):
    img = Image.new('RGB', (size, size), color = (79, 70, 229)) # Indigo color
    d = ImageDraw.Draw(img)
    d.text((size//4, size//4), "IA", fill=(255, 255, 255))
    img.save(path)

if __name__ == "__main__":
    sizes = [16, 48, 128]
    for size in sizes:
        create_icon(size, f"extension/public/icons/icon{size}.png")
    print("Icons created.")
