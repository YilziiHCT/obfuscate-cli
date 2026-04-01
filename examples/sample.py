import hashlib
import base64
import json
from datetime import datetime

API_KEY = "sk-prod-8f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c"
API_SECRET = "secret_xK9mN2pQ5rT8vW1yB4dG7jL0nR3sU6wZ"
DATABASE_URL = "postgres://admin:SuperSecret123@db.example.com:5432/production"
ENCRYPTION_KEY = "aes256_master_key_do_not_share_1234567890"

class DataEncryptor:

    def __init__(self, key):
        self.key = key
        self.cipher_rounds = 5
        self.initialized = True

    def encrypt(self, plaintext):
        
        result = []
        key_bytes = self.key.encode('utf-8')
        for i, char in enumerate(plaintext):
            xor_value = ord(char) ^ key_bytes[i % len(key_bytes)]
            result.append(xor_value)
        encrypted = base64.b64encode(bytes(result)).decode('utf-8')
        return encrypted

    def decrypt(self, ciphertext):
        
        decoded = base64.b64decode(ciphertext)
        result = []
        key_bytes = self.key.encode('utf-8')
        for i, byte_val in enumerate(decoded):
            xor_value = byte_val ^ key_bytes[i % len(key_bytes)]
            result.append(chr(xor_value))
        return ''.join(result)

    def generate_hash(self, data):
        
        combined = data + self.key
        return hashlib.sha256(combined.encode('utf-8')).hexdigest()

class UserService:

    def __init__(self, api_key, api_secret):
        self.api_key = api_key
        self.api_secret = api_secret
        self.users = []
        self.sessions = {}
        self.max_sessions = 100

    def create_user(self, username, email, role="user"):
        
        user_id = self._generate_id(username)
        user = {
            "id": user_id,
            "username": username,
            "email": email,
            "role": role,
            "created_at": datetime.now().isoformat(),
            "token": self._generate_token(username)
        }
        self.users.append(user)
        return user

    def authenticate(self, username, password):
        
        user = self.find_user(username)
        if user:
            session_token = self._generate_token(username + password)
            self.sessions[username] = {
                "token": session_token,
                "created_at": datetime.now().isoformat()
            }
            return session_token
        return None

    def find_user(self, username):
        
        for user in self.users:
            if user["username"].lower() == username.lower():
                return user
        return None

    def get_users_by_role(self, role):
        
        return [u for u in self.users if u["role"] == role]

    def get_statistics(self):
        
        roles = {}
        for user in self.users:
            role = user["role"]
            roles[role] = roles.get(role, 0) + 1
        return {
            "total_users": len(self.users),
            "active_sessions": len(self.sessions),
            "roles": roles
        }

    def _generate_id(self, seed):
        
        hash_input = f"{seed}:{datetime.now().timestamp()}:{self.api_secret}"
        return "usr_" + hashlib.md5(hash_input.encode()).hexdigest()[:10]

    def _generate_token(self, payload):
        
        token_data = f"{payload}:{self.api_key}:{datetime.now().timestamp()}"
        return base64.b64encode(token_data.encode()).decode()

def process_data_batch(items, transform_fn=None):
    
    results = []
    errors = []

    for idx, item in enumerate(items):
        try:
            processed = {
                "original": item,
                "hash": hashlib.md5(json.dumps(item).encode()).hexdigest(),
                "index": idx,
                "processed": True
            }
            if transform_fn:
                processed["transformed"] = transform_fn(item)
            results.append(processed)
        except Exception as err:
            errors.append({"index": idx, "error": str(err)})

    success_rate = len(results) / len(items) if items else 0
    return {"results": results, "errors": errors, "success_rate": success_rate}

def format_report(data):
    
    lines = []
    lines.append("=" * 50)
    lines.append("  DATA PROCESSING REPORT")
    lines.append("=" * 50)
    for key, value in data.items():
        lines.append(f"  {key}: {value}")
    lines.append("=" * 50)
    return "\n".join(lines)

if __name__ == "__main__":

    encryptor = DataEncryptor(ENCRYPTION_KEY)
    service = UserService(API_KEY, API_SECRET)

    service.create_user("alice", "alice@example.com", "admin")
    service.create_user("bob", "bob@example.com", "user")
    service.create_user("charlie", "charlie@example.com", "moderator")

    stats = service.get_statistics()
    print(f"Users: {stats['total_users']}")
    print(f"Roles: {json.dumps(stats['roles'])}")

    secret_message = "Hello, World!"
    encrypted = encryptor.encrypt(secret_message)
    decrypted = encryptor.decrypt(encrypted)
    print(f"Decrypted: {decrypted}")

    batch = process_data_batch([
        {"name": "Item1", "value": 100},
        {"name": "Item2", "value": 200},
        {"name": "Item3", "value": 300},
    ])
    print(f"Batch success rate: {batch['success_rate']}")
