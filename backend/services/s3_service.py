import boto3
import os
from botocore.exceptions import NoCredentialsError
from fastapi import UploadFile
from dotenv import load_dotenv

load_dotenv()

class S3Service:
    def __init__(self):
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("AWS_BUCKET_NAME")
        self.region = os.getenv("AWS_REGION")

        if not all([self.access_key, self.secret_key, self.bucket_name]):
             print(f"DEBUG: CWD={os.getcwd()}")
             print(f"DEBUG ENV: AccessKey={'Found' if self.access_key else 'Missing'}, Secret={'Found' if self.secret_key else 'Missing'}, Bucket={'Found' if self.bucket_name else 'Missing'}, Region={'Found' if self.region else 'Missing'}")
             print("AWS Credentials missing. S3 Service will fail.")

        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region
        )

    def upload_file(self, file: UploadFile, object_name=None):
        if object_name is None:
            object_name = file.filename

        try:
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                object_name,
                ExtraArgs={'ContentType': file.content_type} # Ideally 'ACL': 'public-read' if making it public, but better to use presigned or public bucket policy
            )
            
            # Construct URL
            url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{object_name}"
            return url
        except NoCredentialsError:
            print("Credentials not available")
            return None
        except Exception as e:
            print(f"S3 Upload Error: {e}")
            return None

    def check_connection(self):
        try:
            # Check if bucket exists and we have access
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            print("✅ AWS successfully connected")
            return True
        except Exception as e:
            print(f"❌ AWS Connection Failed: {e}")
            return False
