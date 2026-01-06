from PIL import Image
import os
import shutil

# Source path of the uploaded logo
source_path = "C:/Users/abhij/.gemini/antigravity/brain/3f9d5c89-2c49-46f4-af11-0b34d479179a/uploaded_image_1767635245246.jpg"

# Destination directory for icons
icon_dir = "c:/Users/abhij/OneDrive/Desktop/IntelliAsk AI/extension/public/icons"

# Ensure directory exists
if not os.path.exists(icon_dir):
    os.makedirs(icon_dir)

def create_icons(source, dest_dir):
    try:
        img = Image.open(source)
        
        # Convert to RGB (in case of PNG alpha or weird JPEG modes) if needed, though JPEG is usually RGB
        if img.mode != 'RGB':
            img = img.convert('RGB')

        sizes = [16, 48, 128]
        
        for size in sizes:
            # Resize using high-quality downsampling
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            dest_path = os.path.join(dest_dir, f"icon{size}.png")
            resized_img.save(dest_path, "PNG")
            print(f"Created {dest_path}")
            
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    create_icons(source_path, icon_dir)
