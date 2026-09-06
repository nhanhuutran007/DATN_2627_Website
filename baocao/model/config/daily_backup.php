<?php
// Sử dụng kết nối từ connect.php
require_once 'connect.php';

class AutoBackup
{
    private $conn;
    private $backupDir = 'backups/';
    private $dbName = 'nhlsports';
    private $daysToKeep = 7;

    public function __construct($connection)
    {
        $this->conn = $connection;

        if (!is_dir($this->backupDir)) {
            mkdir($this->backupDir, 0777, true);
        }
    }

    private function deleteOldBackups()
    {
        try {
            $files = glob($this->backupDir . '*.sql');
            $currentTime = time();
            $secondsToKeep = $this->daysToKeep * 24 * 60 * 60;

            foreach ($files as $file) {
                if (filemtime($file) < $currentTime - $secondsToKeep) {
                    if (!unlink($file)) {
                        throw new Exception("Không thể xóa file backup cũ: $file");
                    }
                }
            }
            return true;
        } catch (Exception $e) {
            error_log("Delete old backups error: " . $e->getMessage());
            return false;
        }
    }

    public function dailyBackup()
    {
        try {
            if (!$this->deleteOldBackups()) {
                error_log("Warning: Failed to delete old backups, proceeding with new backup");
            }

            $filename = $this->backupDir . $this->dbName . '_' . date('Ymd_His') . '.sql';

            $tablesResult = $this->conn->query("SHOW TABLES");
            if (!$tablesResult) {
                throw new Exception("Không thể lấy danh sách bảng: " . $this->conn->error);
            }

            $sql = "-- Backup for database $this->dbName\n";
            $sql .= "-- Created at: " . date('Y-m-d H:i:s') . "\n\n";
            $sql .= "SET FOREIGN_KEY_CHECKS=0;\n";
            $sql .= "SET NAMES utf8mb4;\n\n";

            while ($row = $tablesResult->fetch_row()) {
                $table = $row[0];

                $createTable = $this->conn->query("SHOW CREATE TABLE `$table`");
                if (!$createTable) {
                    throw new Exception("Không thể lấy cấu trúc bảng $table: " . $this->conn->error);
                }
                $createRow = $createTable->fetch_assoc();
                $sql .= "\n-- Table structure for `$table`\n";
                $sql .= "DROP TABLE IF EXISTS `$table`;\n";
                $sql .= $createRow['Create Table'] . ";\n\n";

                $dataResult = $this->conn->query("SELECT * FROM `$table`");
                if ($dataResult && $dataResult->num_rows > 0) {
                    $sql .= "-- Dumping data for table `$table`\n";
                    while ($dataRow = $dataResult->fetch_assoc()) {
                        $sql .= "INSERT INTO `$table` (`" . implode("`,`", array_keys($dataRow)) . "`) VALUES (";
                        $values = array_map(function ($value) {
                            return $value === null ? 'NULL' : "'" . $this->conn->real_escape_string($value) . "'";
                        }, array_values($dataRow));
                        $sql .= implode(",", $values) . ");\n";
                    }
                    $sql .= "\n";
                }
            }

            $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

            // Ghi file
            if (file_put_contents($filename, $sql) === false) {
                throw new Exception("Không thể ghi file backup: $filename");
            }

            // return [
            //     'content' => $sql,
            //     'filename' => $this->dbName . '_' . date('Ymd_His') . '.sql'
            // ];

            return $filename;
        } catch (Exception $e) {
            error_log("Daily backup error: " . $e->getMessage());
            return false;
        }
    }
}

// Xử lý yêu cầu AJAX
header('Content-Type: application/json'); // Thiết lập header JSON
ob_start(); // Bắt đầu bộ đệm để tránh chèn HTML
try {
    $backup = new AutoBackup($conn);
    $result = $backup->dailyBackup();
    ob_end_clean(); // Xóa bộ đệm trước khi trả về JSON
    if ($result) {
        error_log("Backup created successfully: $result");
        echo json_encode([
            'success' => true,
            'filename' => $result,
            'message' => "Backup thành công: $result"
        ]);
    } else {
        error_log("Backup failed");
        echo json_encode([
            'success' => false,
            'error' => 'Backup thất bại'
        ]);
    }
} catch (Exception $e) {
    error_log("Backup error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
