import boto3
import os
from botocore.exceptions import NoCredentialsError
from fastapi import UploadFile

class S3Service:
    def __init__(self):
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("AWS_BUCKET_NAME")
        self.region = os.getenv("AWS_REGION")

        if not all([self.access_key, self.secret_key, self.bucket_name]):
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
