<?php

$DB_HOST = "db.production.example.com";
$DB_USER = "admin_user";
$DB_PASS = "P@ssw0rd!SuperSecret2025";
$DB_NAME = "production_database";
$API_KEY = "pk_live_xK9mN2pQ5rT8vW1yB4dG7jL0nR3sU6wZ";

class DatabaseManager {
    private $host;
    private $user;
    private $password;
    private $database;
    private $connection;

    public function __construct($host, $user, $password, $database) {
        $this->host = $host;
        $this->user = $user;
        $this->password = $password;
        $this->database = $database;
        $this->connection = null;
    }

    public function connect() {
        $this->connection = true;
        return "Connected to {$this->host}/{$this->database}";
    }

    public function buildSelectQuery($table, $columns, $where = null) {
        $cols = implode(", ", $columns);
        $query = "SELECT {$cols} FROM {$table}";
        if ($where !== null) {
            $conditions = array();
            foreach ($where as $key => $value) {
                $conditions[] = "{$key} = '{$value}'";
            }
            $query .= " WHERE " . implode(" AND ", $conditions);
        }
        return $query;
    }

    public function buildInsertQuery($table, $data) {
        $columns = implode(", ", array_keys($data));
        $values = implode(", ", array_map(function($v) {
            return "'{$v}'";
        }, array_values($data)));
        return "INSERT INTO {$table} ({$columns}) VALUES ({$values})";
    }

    public function isConnected() {
        return $this->connection !== null;
    }
}

class CryptoHelper {
    private $secretKey;

    public function __construct($key) {
        $this->secretKey = $key;
    }

    public function encrypt($data) {
        $result = "";
        $keyLen = strlen($this->secretKey);
        for ($i = 0; $i < strlen($data); $i++) {
            $result .= chr(ord($data[$i]) ^ ord($this->secretKey[$i % $keyLen]));
        }
        return base64_encode($result);
    }

    public function decrypt($data) {
        $decoded = base64_decode($data);
        $result = "";
        $keyLen = strlen($this->secretKey);
        for ($i = 0; $i < strlen($decoded); $i++) {
            $result .= chr(ord($decoded[$i]) ^ ord($this->secretKey[$i % $keyLen]));
        }
        return $result;
    }

    public function generateHash($data) {
        return hash("sha256", $data . $this->secretKey);
    }
}

function generateRandomToken($length = 32) {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    $token = "";
    for ($i = 0; $i < $length; $i++) {
        $token .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $token;
}

function sanitizeInput($input) {
    $input = trim($input);
    $input = htmlspecialchars($input, ENT_QUOTES, "UTF-8");
    $input = str_replace(array("\r", "\n"), "", $input);
    return $input;
}

function formatCurrency($amount, $currency = "USD") {
    $symbols = array("USD" => "$", "EUR" => "€", "GBP" => "£");
    $symbol = isset($symbols[$currency]) ? $symbols[$currency] : $currency;
    return $symbol . number_format($amount, 2);
}

$db = new DatabaseManager($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
echo $db->connect() . "\n";

$query = $db->buildSelectQuery("users", array("id", "name", "email"), array("role" => "admin"));
echo "Query: " . $query . "\n";

$crypto = new CryptoHelper($API_KEY);
$encrypted = $crypto->encrypt("Sensitive data: credit card 4532-1234-5678-9012");
$decrypted = $crypto->decrypt($encrypted);
echo "Decrypted: " . $decrypted . "\n";

$token = generateRandomToken(16);
echo "Token: " . $token . "\n";
echo "Price: " . formatCurrency(1299.99) . "\n";
?>
