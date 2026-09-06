<?php
date_default_timezone_set('Asia/Ho_Chi_Minh');
$server = "localhost";
$user = "root";
$pass = "";
$database = "NHLSPORTS";
$conn = new mysqLi($server, $user, $pass, $database);
if ($conn) {
    mysqLi_query($conn, "SET NAMES 'utf8'");
    mysqli_query($conn, "SET time_zone = '+07:00'");
} else {
    echo "Kết nối thất bại";
}
