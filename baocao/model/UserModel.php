<?php
include "config/connect.php";
require 'mail/sendmail.php';
require_once 'vendor/autoload.php';


function checkUserLogin($username, $password)
{
    global $conn;
    $sql = "SELECT * FROM khachhang WHERE username = ? AND password = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "ss", $username, $password);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    return mysqli_fetch_assoc($result);
}

function passBrypt($username)
{
    global $conn;
    $sql = "SELECT password FROM khachhang WHERE username = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $username);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $stmt->close();
    if ($row = mysqli_fetch_assoc($result)) {
        return $row['password'];
    }
    return null;
}

function checkUserExist($username)
{
    global $conn;
    $sql = "SELECT * FROM khachhang WHERE username = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $username);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    mysqli_stmt_close($stmt);
    return mysqli_fetch_assoc($result);
}
function checkEmailExist($email)
{
    global $conn;
    $sql = "SELECT * FROM khachhang WHERE email = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    mysqli_stmt_close($stmt);
    return mysqli_fetch_assoc($result);
}

function dangky($username, $password, $email, $phone, $fullname)
{
    global $conn;
    if (!$conn) {
        die("Lỗi kết nối database: " . mysqli_connect_error());
    }
    $sql = "INSERT INTO khachhang(username, password, email, phone, fullname, address) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        die("Lỗi chuẩn bị truy vấn: " . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($stmt, "ssssss", $username, $password, $email, $phone, $fullname, $address);
    $success = mysqli_stmt_execute($stmt);
    if (!$success) {
        die("Lỗi khi thực thi truy vấn: " . mysqli_error($conn));
    }
    $insert_id = mysqli_insert_id($conn);
    mysqli_stmt_close($stmt);
    return $insert_id;
}

function storeResetToken($email, $token)
{
    global $conn;
    $expires_at = date("Y-m-d H:i:s", strtotime("+5 minutes"));
    $sql = "UPDATE khachhang SET reset_token = ?, reset_expires = ? WHERE email = ?";
    $stmt = mysqli_prepare($conn, $sql);
    $stmt->bind_param("sss", $token, $expires_at, $email);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}

function getUserByToken($token)
{
    global $conn;
    $sql = "SELECT * FROM khachhang WHERE reset_token= ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $token);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    return mysqli_fetch_assoc($result);
}

function changePassword($passBrypt, $token)
{
    global $conn;
    $sql = "SELECT email FROM khachhang WHERE reset_token = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $token);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);

    if ($user) {
        $email = $user['email'];
        // $hashedPassword = password_hash($newpass, PASSWORD_BCRYPT);
        $sql = "UPDATE khachhang SET password = ?, reset_token = NULL, reset_expires = NULL WHERE email = ?";
        $stmt = mysqli_prepare($conn, $sql);
        mysqli_stmt_bind_param($stmt, "ss", $passBrypt, $email);
        mysqli_stmt_execute($stmt);
        return true;
    }
    return false;
}

//zxcvb
function addUser($username, $password, $email, $fullname, $phone, $address)
{
    global $conn;
    $stmt = $conn->prepare("INSERT INTO khachhang (username, password, email, fullname, phone, address) 
                           VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $username, $password, $email, $fullname, $phone, $address);
    return $stmt->execute();
}
//zxcvb
function updateUser($id_user, $username, $email, $fullname, $phone, $address, $password = null)
{
    global $conn;

    if ($password) {
        $sql = "UPDATE khachhang SET username=?, email=?, fullname=?, phone=?, address=?, password=? WHERE id_user=?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssssi", $username, $email, $fullname, $phone, $address, $password, $id_user);
    } else {
        $sql = "UPDATE khachhang SET username=?, email=?, fullname=?, phone=?, address=? WHERE id_user=?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssssi", $username, $email, $fullname, $phone, $address, $id_user);
    }

    return $stmt->execute();
}
//zxcvb
function verifyAdminPassword($id_user, $password)
{
    global $conn;
    $sql = "SELECT password FROM khachhang WHERE id_user = ? AND username = 'admin'";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $id_user);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    if ($row = mysqli_fetch_assoc($result)) {
        return password_verify($password, $row['password']);
    }
    return false;
}

function updateToken($username)
{
    global $conn;
    $sql = "UPDATE khachhang SET reset_token = NULL, reset_expires = NULL WHERE username = ?";
    $stmt = mysqli_prepare($conn, $sql);
    $stmt->bind_param("s", $username);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}

function getProductFromTable($item)
{
    global $conn;
    $additionalCondition = "quantity > 0 AND is_active = 1";
    $products = [];

    // Tách chuỗi thành mảng các thể loại
    $items = array_map('trim', explode(',', $item));

    $allphukien = ["phukienbongda", "phukiencaulong", "phukienbongro", "phukienbongchuyen", "phukienbia", "phukienpick", "phukiengym"];

    $specialItems = [
        "bobongdanam" => ["quanaobongda"],
        "bocaulongnam" => ["quanaocaulong"],
        "bobongchuyennam" => ["quanaobongchuyen"],
        "bothethaonam" => ["quanaobongda", "quanaobongchuyen", "quanaocaulong"],
        "giaybongronam" => ["giaybongro"],
        "giaybongchuyennam" => ["giaybongchuyen"],
        "giaybongdanam" => ["giaybongda"],
        "giaychaybonam" => ["giaychaybo"],
        "giaycaulongnam" => ["giaycaulong"],
        "giaythethaonam" => ["giaybongro", "giaybongchuyen", "giaybongda", "giaychaybo", "giaycaulong"],
        "bocaulongnu" => ["quanaocaulong"],
        "bobongchuyennu" => ["quanaobongchuyen"],
        "bothethaonu" => ["quanaobongchuyen", "quanaocaulong"],
        "giaybongronu" => ["giaybongro"],
        "giaybongchuyennu" => ["giaybongchuyen"],
        "giaychaybonu" => ["giaychaybo"],
        "giaycaulongnu" => ["giaycaulong"],
        "giaythethaonu" => ["giaybongro", "giaybongchuyen", "giaychaybo", "giaycaulong"],
        "pkbongda" => ["phukienbongda"],
        "pkcaulong" => ["phukiencaulong"],
        "pkbongro" => ["phukienbongro"],
        "pkbongchuyen" => ["phukienbongchuyen"],
        "pkbia" => ["phukienbia"],
        "pkkhac" => ["phukienbongda", "phukiencaulong", "phukienbongro", "phukienbongchuyen", "phukienbia"],
        "balo&tui" => $allphukien,
        "balo" => $allphukien,
        "balo_tuidung" => $allphukien,
        "thoitrangnam" => ["quanaobongro", "quanaobongchuyen", "quanaobongda", "quanaogym", "quanaochaybo", "quanaocaulong", "aobia"],
        "thoitrangnu" => ["quanaobongro", "quanaobongchuyen", "quanaogym", "quanaochaybo", "quanaocaulong"]
    ];

    $shoeItems = [
        "giaybongronam",
        "giaybongchuyennam",
        "giaybongdanam",
        "giaychaybonam",
        "giaycaulongnam",
        "giaythethaonam",
        "giaybongronu",
        "giaybongchuyennu",
        "giaychaybonu",
        "giaycaulongnu",
        "giaythethaonu"
    ];

    $accessoryItems = [
        "pkbongda",
        "pkcaulong",
        "pkbongro",
        "pkbongchuyen",
        "pkbia",
        "pkkhac",
        "balo&tui",
        "balo",
        "balo_tuidung"
    ];

    foreach ($items as $singleItem) {
        if (array_key_exists($singleItem, $specialItems)) {
            $tables = $specialItems[$singleItem];

            foreach ($tables as $tableName) {
                $genderCondition = "";
                if (strpos($singleItem, "nam") !== false) {
                    $genderCondition = "((name LIKE '%nam%' AND name NOT LIKE '%nữ%') OR (name NOT LIKE '%nữ%') OR (name NOT LIKE '%nam%' AND name NOT LIKE '%nữ%') OR name LIKE '%nam nữ%')";
                } else {
                    $genderCondition = "((name LIKE '%nữ%' AND name NOT LIKE '%nam%') OR (name LIKE '%nữ Việt Nam%') OR (name NOT LIKE '%nam%' AND name NOT LIKE '%nữ%') OR name LIKE '%nam nữ%')";
                }

                if (in_array($singleItem, $shoeItems)) {
                    $condition = "name LIKE 'giày%'";
                } elseif (in_array($singleItem, $accessoryItems)) {
                    if ($singleItem === "balo&tui") {
                        $condition = "name LIKE 'balo%' OR name LIKE 'túi%'";
                    } elseif ($singleItem === "balo") {
                        $condition = "name LIKE 'balo%'";
                    } elseif ($singleItem === "balo_tuidung") {
                        $condition = "name LIKE 'túi%'";
                    } else {
                        $condition = "name NOT LIKE 'áo%' AND name NOT LIKE '%quần%'";
                    }
                } else {
                    // $condition = "(name LIKE 'bộ%' AND ($genderCondition))";
                    $condition = "$genderCondition";
                }

                $sql = "SELECT * FROM $tableName" . (!empty($condition) ? " WHERE $condition AND $additionalCondition" : "$additionalCondition");

                $result = mysqli_query($conn, $sql);

                if ($result) {
                    while ($row = mysqli_fetch_assoc($result)) {
                        $products[] = [
                            "image" => $row['image'],
                            "name" => $row['name'],
                            "price" => $row['price'],
                            "oprice" => $row['oprice'],
                            "table_name" => $tableName
                        ];
                    }
                }
            }
        } elseif (strpos($singleItem, "nam") !== false || strpos($singleItem, "nu") !== false) {
            if (strpos($singleItem, "nam") !== false) {
                $tableQuery = "SHOW TABLES LIKE '%quanao%'";
                $tableResult = mysqli_query($conn, $tableQuery);
                $clothingTables = [];
                while ($row = mysqli_fetch_array($tableResult)) {
                    $clothingTables[] = $row[0];
                }
                if (strpos($singleItem, "quan") !== false) {
                    $queries = [
                        "quanshortnam" => "(name NOT LIKE '%dài%' AND name NOT LIKE '%body%') 
                            AND (name LIKE '%quần%' OR name LIKE 'bộ quần áo%' OR name LIKE 'bộ%') 
                            AND (name LIKE '%nam%' OR name NOT LIKE '%nữ%')",
                        "quandainam" => "name NOT LIKE '%nữ%' AND name LIKE '%dài%' AND name NOT LIKE '%áo%'",
                        "quanbodynam" => "name NOT LIKE '%nữ%' AND name LIKE '%body%' AND name NOT LIKE '%áo%'",
                        "default" => "name NOT LIKE '%nữ%' AND (name LIKE '%quần%' OR name LIKE '%quần%' OR name LIKE 'bộ%')"
                    ];
                } else if (strpos($singleItem, "ao") !== false) {
                    $queries = [
                        "aophongnam" => "name NOT LIKE '%khoác%' AND name NOT LIKE '%body%' AND name NOT LIKE '%polo%' AND name NOT LIKE '%nữ%' AND name NOT LIKE '%nỉ%' AND name NOT LIKE '%hoodie%' AND name NOT LIKE 'quần%'",
                        "aopolonam" => "name NOT LIKE '%nữ%' AND name LIKE '%polo%'",
                        "aokhoacnam" => "name NOT LIKE '%nữ%' AND name LIKE '%khoác%'",
                        "aohoodienam" => "(name LIKE '%nỉ%' AND name LIKE '%nam%') OR (name LIKE '%hoodie%' AND name LIKE '%nam%')",
                        "aobodynam" => "name NOT LIKE '%nữ%' AND name LIKE '%body%'",
                        "default" => "name NOT LIKE '%nữ%' AND name NOT LIKE 'quần%'"
                    ];
                } else {
                    continue;
                }
            } elseif (strpos($singleItem, "nu") !== false) {
                $tableQuery = "SHOW TABLES LIKE '%quanao%'";
                $tableResult = mysqli_query($conn, $tableQuery);
                $clothingTables = [];
                while ($row = mysqli_fetch_array($tableResult)) {
                    $clothingTables[] = $row[0];
                }
                if (strpos($singleItem, "quan") !== false) {
                    $queries = [
                        "quanshortnu" => "(name NOT LIKE '%dài%' AND name NOT LIKE '%body%' AND name NOT LIKE '%đá%') 
                            AND (name LIKE '%quần%' OR name LIKE 'bộ%') 
                            AND (name LIKE '%nữ%' OR name NOT LIKE '%nam%')",
                        "quandainu" => "name NOT LIKE '%nam%' AND name LIKE '%dài%' AND name LIKE '%quần%'",
                        "quanleggingnu" => "name NOT LIKE '%nam%' AND name LIKE '%legging%' AND name NOT LIKE '%áo%'",
                        "default" => "name NOT LIKE '%nam%' AND name NOT LIKE '%đá%' AND (name LIKE '%quần%' OR name LIKE 'bộ%')"
                    ];
                } else if (strpos($singleItem, "ao") !== false) {
                    $queries = [
                        "aophongnu" => "name NOT LIKE '%khoác%' AND name NOT LIKE '%hoodie%' AND name NOT LIKE '%polo%' AND name NOT LIKE '%nam%' AND name NOT LIKE '%nỉ%' AND name NOT LIKE 'quần%' AND name NOT LIKE '%đá%' AND name NOT LIKE '%body%'",
                        "aopolonu" => "name NOT LIKE '%nam%' AND name LIKE '%polo%' AND name NOT LIKE '%đá%'",
                        "aokhoacnu" => "name NOT LIKE '%nam%' AND name LIKE '%khoác%'",
                        "aohoodienu" => "(name LIKE '%nỉ%' AND name LIKE '%nữ%') OR (name LIKE '%hoodie%' AND name LIKE '%nữ%')",
                        "default" => "name NOT LIKE '%nam%' AND name NOT LIKE '%đá%' AND (name NOT LIKE '%quần%' OR name LIKE 'bộ%')"
                    ];
                } else {
                    continue;
                }
            }
            foreach ($clothingTables as $tableName) {
                $checkColumnQuery = "SHOW COLUMNS FROM $tableName LIKE 'name'";
                $columnResult = mysqli_query($conn, $checkColumnQuery);

                if (mysqli_num_rows($columnResult) > 0) {
                    $sql = "SELECT * FROM $tableName WHERE $additionalCondition AND " . ($queries[$singleItem] ?? $queries["default"]);
                    $result = mysqli_query($conn, $sql);

                    if ($result) {
                        while ($row = mysqli_fetch_assoc($result)) {
                            $products[] = [
                                "image" => $row['image'],
                                "name" => $row['name'],
                                "price" => $row['price'],
                                "oprice" => $row['oprice'],
                                "table_name" => $tableName
                            ];
                        }
                    }
                }
            }
        } else {
            $giaydep = ["giaybongro", "giaybongchuyen", "giaybongda", "giaytapgym", "giaychaybo", "giaycaulong", "giaypickleball"];
            $quanao = ["quanaobongro", "quanaobongchuyen", "quanaobongda", "quanaogym", "quanaochaybo", "quanaocaulong", "aobia"];
            $bong = ["quabongro", "quabongchuyen", "quabongda"];
            $phukien = ["phukienbongro", "phukienbongchuyen", "phukienbongda", "phukiengym", "phukienchaybo", "phukiencaulong", "phukienbia", "phukienpick"];

            $tableMapping = [
                "bongro" => ["quabongro", "giaybongro", "quanaobongro", "phukienbongro"],
                "quabongro" => ["quabongro"],
                "giaybongro" => ["giaybongro"],
                "quanaobongro" => ["quanaobongro"],
                "phukienbongro" => ["phukienbongro"],
                "bongchuyen" => ["quabongchuyen", "giaybongchuyen", "quanaobongchuyen", "phukienbongchuyen"],
                "quabongchuyen" => ["quabongchuyen"],
                "giaybongchuyen" => ["giaybongchuyen"],
                "quanaobongchuyen" => ["quanaobongchuyen"],
                "phukienbongchuyen" => ["phukienbongchuyen"],
                "bongda" => ["quabongda", "giaybongda", "quanaobongda", "phukienbongda"],
                "quabongda" => ["quabongda"],
                "giaybongda" => ["giaybongda"],
                "quanaobongda" => ["quanaobongda"],
                "phukienbongda" => ["phukienbongda"],
                "tapgym" => ["giaytapgym", "quanaogym", "phukiengym"],
                "giaytapgym" => ["giaytapgym"],
                "quanaogym" => ["quanaogym"],
                "phukiengym" => ["phukiengym"],
                "chaybo" => ["giaychaybo", "quanaochaybo", "phukienchaybo"],
                "giaychaybo" => ["giaychaybo"],
                "quanaochaybo" => ["quanaochaybo"],
                "phukienchaybo" => ["phukienchaybo"],
                "caulong" => ["votcaulong", "cauthidau", "giaycaulong", "quanaocaulong", "phukiencaulong"],
                "votcaulong" => ["votcaulong"],
                "cauthidau" => ["cauthidau"],
                "giaycaulong" => ["giaycaulong"],
                "quanaocaulong" => ["quanaocaulong"],
                "phukiencaulong" => ["phukiencaulong"],
                "bia" => ["gaybia", "aobia", "phukienbia"],
                "gaybia" => ["gaybia"],
                "aobia" => ["aobia"],
                "phukienbia" => ["phukienbia"],
                "pickleball" => ["votpickleball", "giaypickleball", "phukienpick"],
                "votpickleball" => ["votpickleball"],
                "giaypickleball" => ["giaypickleball"],
                "phukienpick" => ["phukienpick"],
                "quanaodongluc" => $quanao,
                "giaydepdongluc" => $giaydep,
                "bongdongluc" => $bong,
                "pkttdongluc" => $phukien,
                "dongluc" => array_merge($quanao, $giaydep, $bong, $phukien),
                "quanaograndsport" => $quanao,
                "giaydepgrandsport" => $giaydep,
                "grandsport" => array_merge($quanao, $giaydep),
                "spalding" => array_merge($quanao, $giaydep, $bong, $phukien),
                "bongspalding" => $bong,
                "pkttspalding" => $phukien,
                "peak" => array_merge($quanao, $giaydep, $bong, $phukien),
                "giaybongropeak" => ["giaybongro"],
                "giaychaybopeak" => ["giaychaybo"],
                "bubadu" => array_merge($quanao, $giaydep, $bong, $phukien, ["votcaulong", "cauthidau"]),
                "quanaobubadu" => $quanao,
                "votbubadu" => ["votcaulong"],
                "pkttbubadu" => $phukien,
                "saovang" => array_merge($quanao, $giaydep, $bong, $phukien),
                "giaysaovang" => ["giaybongchuyen"],
                "quanaosaovang" => $quanao,
                "pkttsaovang" => $phukien,
                "peri" => array_merge($quanao, $giaydep, $bong, $phukien, ["gaybia"]),
                "coperi" => ["gaybia"],
                "pkttperi" => $phukien,
                "zocker" => array_merge($quanao, $giaydep, $bong, $phukien),
                "giaychaybozocker" => ["giaychaybo"],
                "giaybongdazocker" => ["giaybongda"],
                "pkttzocker" => $phukien,
                "pickzocker" => ["votpickleball", "giaypickleball", "phukienpick"],
                "saleoutlet40" => array_merge($quanao, $giaydep, $bong, $phukien, ["votcaulong", "cauthidau", "votpickleball", "gaybia"])
            ];

            $brandNames = [
                "dongluc" => "Động Lực",
                "grandsport" => "Grand Sport",
                "spalding" => "Spalding",
                "peak" => "Peak",
                "bubadu" => "Bubadu",
                "saovang" => "Sao Vàng",
                "peri" => "Peri",
                "zocker" => "Zocker",
            ];

            if (
                strpos($singleItem, "dongluc") !== false || strpos($singleItem, "grandsport") !== false || strpos($singleItem, "spalding") !== false
                || strpos($singleItem, "peak") !== false || strpos($singleItem, "bubadu") !== false || strpos($singleItem, "saovang") !== false
                || strpos($singleItem, "peri") !== false || strpos($singleItem, "zocker") !== false
            ) {
                $brandFilter = "";
                foreach ($brandNames as $key => $brand) {
                    if (strpos($singleItem, $key) !== false) {
                        $brandFilter = "WHERE brand = '$brand'";
                        break;
                    }
                }
                if (array_key_exists($singleItem, $tableMapping)) {
                    $tables = $tableMapping[$singleItem];

                    foreach ($tables as $tableName) {
                        $sql = "SELECT * FROM $tableName $brandFilter AND $additionalCondition";
                        $result = mysqli_query($conn, $sql);

                        if ($result) {
                            while ($row = mysqli_fetch_assoc($result)) {
                                $products[] = [
                                    "image" => $row['image'],
                                    "name" => $row['name'],
                                    "price" => $row['price'],
                                    "oprice" => $row['oprice'],
                                    "table_name" => $tableName
                                ];
                            }
                        }
                    }
                }
            } elseif (strpos($singleItem, "saleoutlet40") !== false) {
                if (array_key_exists($singleItem, $tableMapping)) {
                    $tables = $tableMapping[$singleItem];

                    foreach ($tables as $tableName) {
                        $sql = "SELECT * FROM $tableName WHERE ((oprice - price) / oprice * 100) < 40 AND $additionalCondition ";
                        $result = mysqli_query($conn, $sql);
                        if (!$result) {
                            continue; // Bỏ qua bảng này và tiếp tục với bảng tiếp theo
                        }

                        if ($result) {
                            while ($row = mysqli_fetch_assoc($result)) {
                                $products[] = [
                                    "image" => $row['image'],
                                    "name" => $row['name'],
                                    "price" => $row['price'],
                                    "oprice" => $row['oprice'],
                                    "table_name" => $tableName
                                ];
                            }
                        }
                    }
                }
            } elseif (array_key_exists($singleItem, $tableMapping)) {
                $tables = $tableMapping[$singleItem];

                foreach ($tables as $tableName) {
                    $sql = "SELECT * FROM $tableName WHERE $additionalCondition";
                    $result = mysqli_query($conn, $sql);

                    if ($result) {
                        while ($row = mysqli_fetch_assoc($result)) {
                            $products[] = [
                                "image" => $row['image'],
                                "name" => $row['name'],
                                "price" => $row['price'],
                                "oprice" => $row['oprice'],
                                "table_name" => $tableName
                            ];
                        }
                    }
                }
            }
        }
    }
    return array_unique($products, SORT_REGULAR); // Loại bỏ trùng lặp nếu có
}

function selectFromAllTablesByName($name)
{
    global $conn;
    $additionalCondition = " quantity > 0 AND is_active = 1 ";
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];
    foreach ($tables as $table) {
        $sql = "SELECT * FROM $table WHERE $additionalCondition AND name = ? LIMIT 1 ";
        $stmt = mysqli_prepare($conn, $sql);
        if (!$stmt) {
            continue;
        }
        mysqli_stmt_bind_param($stmt, "s", $name);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);

        if ($row = mysqli_fetch_assoc($result)) {
            return [
                "id" => $row['id'],
                "table" => $table,
                "image" => $row['image'],
                "image2" => $row['image2'],
                "image3" => $row['image3'],
                "image4" => $row['image4'],
                "name" => $row['name'],
                "price" => $row['price'],
                "oprice" => $row['oprice'],
                "brand" => $row['brand'],
                "table" => $table,
                "description_id" => $row['description_id'] ?? null
            ];
        }
        mysqli_stmt_close($stmt);
    }
    return null;
}


// Hàm đổi mật khẩu trong trang tài khoản
function changePasswordInAccount($passBryptNew, $email)
{
    global $conn;
    $sql = "UPDATE khachhang SET password = ? WHERE email = ?";
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        error_log("changePasswordInAccount: Error: Failed to prepare statement, error=" . mysqli_error($conn));
        return false;
    }
    mysqli_stmt_bind_param($stmt, "ss", $passBryptNew, $email);
    $success = mysqli_stmt_execute($stmt);
    $affected_rows = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);

    if ($success && $affected_rows > 0) {
        return true;
    } else {
        error_log("changePasswordInAccount: Error: Update failed, affected_rows=$affected_rows, error=" . mysqli_error($conn));
        return false;
    }
}

// Lấy giỏ hàng của người dùng
function getCartByUser($id_user)
{
    global $conn;
    $sql = "SELECT g.id, g.id_sanpham, g.quantity, g.size, s.name, s.image, s.price 
            FROM giohang g 
            JOIN sanpham s ON g.id_sanpham = s.id 
            WHERE g.id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $id_user);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $cart = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $cart[] = $row;
    }
    return $cart;
}

// Thêm sản phẩm vào giỏ hàng
function addToCart($id_user, $id_sanpham, $quantity, $size)
{
    global $conn;
    $sql = "INSERT INTO giohang (id_user, id_sanpham, quantity, size) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE quantity = quantity + ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "iiisi", $id_user, $id_sanpham, $quantity, $size, $quantity);
    $success = mysqli_stmt_execute($stmt);
    if (!$success) {
        error_log("Error adding to cart: " . mysqli_error($conn));
    }
    return $success;
}

// Cập nhật số lượng sản phẩm trong giỏ hàng
function updateProductQuantity($id_user, $product_name, $size, $quantity)
{
    global $conn;

    if ($size === null || strtolower($size) === 'null' || strtolower($size) === 'n/a') {
        $stmt = $conn->prepare("UPDATE giohang SET quantity = ? WHERE id_user = ? AND name = ? AND (size IS NULL OR size = 'N/A')");
        $stmt->bind_param("iis", $quantity, $id_user, $product_name);
    } else {
        $stmt = $conn->prepare("UPDATE giohang SET quantity = ? WHERE id_user = ? AND name = ? AND size = ?");
        $stmt->bind_param("iiss", $quantity, $id_user, $product_name, $size);
    }

    return $stmt->execute();
}

function removeProductFromCart($id_user, $product_name, $size)
{
    global $conn;

    if ($size === null || strtolower($size) === 'null' || strtolower($size) === 'n/a') {
        $stmt = $conn->prepare("DELETE FROM giohang WHERE id_user = ? AND name = ? AND (size IS NULL OR size = 'N/A')");
        $stmt->bind_param("is", $id_user, $product_name);
    } else {
        $stmt = $conn->prepare("DELETE FROM giohang WHERE id_user = ? AND name = ? AND size = ?");
        $stmt->bind_param("iss", $id_user, $product_name, $size);
    }

    return $stmt->execute();
}

// Lấy thông tin người dùng
function getUserInfo($username)
{
    global $conn;
    $sql = "SELECT id_user, username, fullname, email, phone, avatar, password, address, active_2fa FROM khachhang WHERE username = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "s", $username);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    return mysqli_fetch_assoc($result);
}

// Các hàm tìm kiếm và lấy sản phẩm (giữ nguyên)
// Các hàm tìm kiếm và lấy sản phẩm (giữ nguyên)
function searchProducts($query = '')
{
    global $conn;
    $additionalCondition = "quantity > 0 AND is_active = 1";
    $products = [];
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];

    foreach ($tables as $table) {
        $sql = "SELECT id, name, price, oprice, image FROM $table WHERE $additionalCondition";
        if (!empty($query)) {
            $sql .= " AND name LIKE ?";
            $queryParam = "%" . $query . "%";
        }
        $sql .= " LIMIT 6";
        $stmt = mysqli_prepare($conn, $sql);
        if (!$stmt) {
            error_log("Error preparing query for table $table: " . mysqli_error($conn));
            continue;
        }
        if (!empty($query)) {
            mysqli_stmt_bind_param($stmt, "s", $queryParam);
        }
        if (!mysqli_stmt_execute($stmt)) {
            error_log("Error executing query for table $table: " . mysqli_error($conn));
            continue;
        }
        $result = mysqli_stmt_get_result($stmt);

        while ($row = mysqli_fetch_assoc($result)) {
            $products[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'price' => $row['price'],
                'oprice' => $row['oprice'],
                'image' => $row['image'],
                'table_name' => $table
            ];
        }
        mysqli_stmt_close($stmt);

        if (count($products) >= 6) {
            $products = array_slice($products, 0, 6);
            break;
        }
    }
    return $products;
}

function createVoucher($insert_id)
{
    global $conn;
    $sql = "INSERT INTO voucher(title , content, name, price, active, id_user) VALUES ('Freeship', 'Mã giảm giá FREESHIP
Nhập mã để miễn phí vận chuyển', 'FREESHIP', 'FREESHIP', 1, ?)";
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        die("Lỗi chuẩn bị truy vấn: " . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($stmt, "i", $insert_id);
    if (!$stmt->execute()) {
        echo "Lỗi khi thêm voucher: " . $stmt->error;
    }
    mysqli_stmt_close($stmt);
    return null;
}

function searchProductsFull($query = '')
{
    global $conn;
    $additionalCondition = "quantity > 0 AND is_active = 1";
    $products = [];
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];

    foreach ($tables as $table) {
        $sql = "SELECT id, name, price, oprice, image FROM $table WHERE $additionalCondition";
        if (!empty($query)) {
            $sql .= " AND name LIKE ?";
            $queryParam = "%" . $query . "%";
        }
        $stmt = mysqli_prepare($conn, $sql);
        if (!$stmt) {
            error_log("Error preparing query for table $table: " . mysqli_error($conn));
            continue;
        }
        if (!empty($query)) {
            mysqli_stmt_bind_param($stmt, "s", $queryParam);
        }
        if (!mysqli_stmt_execute($stmt)) {
            error_log("Error executing query for table $table: " . mysqli_error($conn));
            continue;
        }
        $result = mysqli_stmt_get_result($stmt);

        while ($row = mysqli_fetch_assoc($result)) {
            $products[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'price' => $row['price'],
                'oprice' => $row['oprice'],
                'image' => $row['image'],
                'table_name' => $table
            ];
        }
        mysqli_stmt_close($stmt);
    }
    return $products;
}


//thêm mô tả vào sản phẩm
function addProductDescription($name, $chatlieu, $thietke, $mausac, $kichthuoc)
{
    global $conn;

    $stmt = $conn->prepare("INSERT INTO motasanpham (name, chatlieu, thietke, mausac, kichthuoc) VALUES (?, ?, ?, ?, ?)");
    if ($stmt === false) {
        throw new Exception("Lỗi prepare SQL: " . $conn->error);
    }

    $stmt->bind_param("sssss", $name, $chatlieu, $thietke, $mausac, $kichthuoc);
    if (!$stmt->execute()) {
        throw new Exception("Lỗi khi thêm mô tả sản phẩm: " . $stmt->error);
    }

    $description_id = $stmt->insert_id;
    $stmt->close();

    return $description_id;
}

function themSanPham($table, $name_product, $brand, $price, $oprice, $warranty, $image_name, $image2_name, $image3_name, $image4_name, $image_tmp_name, $image2_tmp_name, $image3_tmp_name, $image4_tmp_name, $quantity, $sizes, $quantities, $description_id = 0)
{
    // mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    global $conn;

    $parent_id_map = [
        'quanaobongro' => 3,
        'giaybongro' => 2,
        'phukienbongro' => 4,
        'quabongro' => 1,
        'quanaobongchuyen' => 3,
        'giaybongchuyen' => 2,
        'phukienbongchuyen' => 4,
        'quabongchuyen' => 1,
        'quanaobongda' => 3,
        'giaybongda' => 2,
        'phukienbongda' => 4,
        'quabongda' => 1,
        'quanaogym' => 2,
        'giaytapgym' => 1,
        'phukiengym' => 3,
        'quanaochaybo' => 2,
        'giaychaybo' => 1,
        'phukienchaybo' => 3,
        'quanaocaulong' => 4,
        'giaycaulong' => 3,
        'phukiencaulong' => 5,
        'votcaulong' => 1,
        'cauthidau' => 2,
        'aobia' => 2,
        'gaybia' => 1,
        'phukienbia' => 3,
        'votpickleball' => 1,
        'giaypickleball' => 2,
        'phukienpick' => 3
    ];

    $parent_id = $parent_id_map[$table] ?? 0;

    $conn->begin_transaction();

    try {
        if (in_array($table, ['votcaulong', 'votpickleball', 'gaybia'])) {
            $sql = "INSERT INTO $table (parent_id, name, image, image2, image3, image4, brand, price, oprice, quantity, warrenty, description_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            if ($stmt === false) {
                throw new Exception("Lỗi prepare SQL: " . $conn->error);
            }
            $stmt->bind_param("issssssiiiii", $parent_id, $name_product, $image_name, $image2_name, $image3_name, $image4_name, $brand, $price, $oprice, $quantity, $warranty, $description_id);
        } else {
            $sql = "INSERT INTO $table (parent_id, name, image, image2, image3, image4, brand, price, oprice, quantity, description_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            if ($stmt === false) {
                throw new Exception("Lỗi prepare SQL: " . $conn->error);
            }
            $stmt->bind_param("issssssssii", $parent_id, $name_product, $image_name, $image2_name, $image3_name, $image4_name, $brand, $price, $oprice, $quantity, $description_id); ///price dang de varchar
        }
        $success = $stmt->execute();

        if (!$success) {
            throw new Exception("Lỗi khi thêm sản phẩm: " . $stmt->error);
        }

        $product_id = $stmt->insert_id;
        $stmt->close();

        // // Rest of your code remains the same
        $size_table = '';
        if (strpos($table, 'giay') !== false) {
            $size_table = 'sizegiay';
        } elseif (strpos($table, 'quanao') !== false || $table === 'aobia') {
            $size_table = 'sizequanao';
        }

        if (!empty($size_table) && !empty($sizes)) {
            foreach ($sizes as $index => $size) {
                $qty = intval($quantities[$index]);
                $stmt = $conn->prepare("INSERT INTO $size_table (table_name, parent_id, name_product, size, quantity) VALUES (?, ?, ?, ?, ?)");
                if ($stmt === false) {
                    throw new Exception("Lỗi prepare bảng size: " . $conn->error);
                }
                $stmt->bind_param("sissi", $table, $product_id, $name_product, $size, $qty);
                if (!$stmt->execute()) {
                    throw new Exception("Lỗi khi thêm size: " . $stmt->error);
                }
                $stmt->close();
            }
        }
        $conn->commit();
        move_uploaded_file($image_tmp_name, '../view/img/' . $image_name);
        move_uploaded_file($image2_tmp_name, '../view/img/' . $image2_name);
        move_uploaded_file($image3_tmp_name, '../view/img/' . $image3_name);
        move_uploaded_file($image4_tmp_name, '../view/img/' . $image4_name);
        return $success;
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function themDonHang($username, $fullname, $phone, $address, $totalAll, $sale, $tienship, $freeship, $grandtotal, $paymentmethod, $note)
{
    global $conn;
    $sql = "INSERT INTO donhang(username, fullname, phone, address, totalAll, sale, tienship, freeship, grandtotal, paymentmethod, note, ngaydat) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        die("Lỗi chuẩn bị truy vấn: " . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($stmt, "sssssssssss", $username, $fullname, $phone, $address, $totalAll, $sale, $tienship, $freeship, $grandtotal, $paymentmethod, $note);
    if (!$stmt->execute()) {
        echo "Lỗi khi thêm sản phẩm: " . $stmt->error;
    }
    $donhang_id = mysqli_insert_id($conn);
    mysqli_stmt_close($stmt);
    return $donhang_id;
}

function themDonHangChiTiet($nameProduct, $imageProduct, $size, $quantity, $priceDetail, $iddonhang)
{
    global $conn;
    // Kiểm tra xem các mảng có trống hay không
    if (empty($nameProduct) || empty($imageProduct) || empty($size) || empty($quantity) || empty($priceDetail)) {
        echo "Dữ liệu không hợp lệ!";
        return;
    }

    // Duyệt qua các sản phẩm trong mảng và thực hiện insert
    foreach ($nameProduct as $index => $product) {
        $sql = "INSERT INTO donhangchitiet(image, name_product, size, quantity, price, iddonhang) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = mysqli_prepare($conn, $sql);

        if (!$stmt) {
            die("Lỗi chuẩn bị truy vấn: " . mysqli_error($conn));
        }

        // Lấy dữ liệu tương ứng với phần tử hiện tại trong mảng
        $image = $imageProduct[$index] ?? '';
        $productName = $product;
        $productSize = $size[$index] ?? '';
        $productQuantity = $quantity[$index] ?? 0;
        $productPrice = $priceDetail[$index] ?? 0;

        // Bind các giá trị
        mysqli_stmt_bind_param($stmt, "sssssi", $image, $productName, $productSize, $productQuantity, $productPrice, $iddonhang);

        if (!mysqli_stmt_execute($stmt)) {
            echo "Lỗi khi thêm sản phẩm: " . mysqli_error($conn);
        }

        $stmt->close();
    }
}
function donHangChiTiet($iddonhang)
{
    global $conn;
    $sql = "SELECT image, name_product, size, quantity, price
                    FROM donhangchitiet 
                    WHERE iddonhang = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $iddonhang);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $orders[] = [
            'image' => $row['image'],
            'name_product' => $row['name_product'],
            'size' => $row['size'],
            'quantity' => $row['quantity'],
            'price' => $row['price']
        ];
    }
    mysqli_stmt_close($stmt);
    return $orders;
}
function moneyFormDonHangChiTiet($iddonhang)
{
    global $conn;
    $sql = "SELECT totalAll, sale, tienship, grandtotal
                    FROM donhang 
                    WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $iddonhang);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $orders[] = [
            'totalAll' => $row['totalAll'],
            'sale' => $row['sale'],
            'tienship' => $row['tienship'],
            'grandtotal' => $row['grandtotal'],
        ];
    }
    mysqli_stmt_close($stmt);
    return $orders;
}
function updateVoucher($namevoucher, $id_user)
{
    global $conn;
    $sql = "UPDATE voucher SET active = 0 WHERE name = ? AND id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);

    if (!$stmt) {
        error_log("Lỗi prepare: " . mysqli_error($conn));
        return;
    }

    mysqli_stmt_bind_param($stmt, "si", $namevoucher, $id_user);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
}
//Kiểm tra sản phẩm đã trong giỏ hàng trong database chưa
function checkProductInDatabase($id_user, $product_name, $size)
{
    global $conn;
    $sql = "SELECT id, quantity FROM giohang WHERE id_user = ? AND name = ? AND size = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $id_user, $product_name, $size);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result;
}
function updateCart($quantity, $id)
{
    global $conn;
    $sql = "UPDATE giohang SET quantity = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("Lỗi prepare: " . mysqli_error($conn));
        return;
    }
    $stmt->bind_param("ii", $quantity, $id);
    $success = $stmt->execute();
    $stmt->close();
    return $success;
}
function insertProductToCart($id_user, $name, $price, $size, $quantity, $image)
{
    global $conn;
    $insert_query = "INSERT INTO giohang (id_user, name, price, size, quantity, image) VALUES (?, ?, ?, ?, ?, ?)";
    $insert_stmt = $conn->prepare($insert_query);
    $insert_stmt->bind_param("isssis", $id_user, $name, $price, $size, $quantity, $image);
    $success = $insert_stmt->execute();
    $insert_stmt->close();
    return $success;
}
function xoaGioHang($id_user)
{
    global $conn;
    $sql = "DELETE FROM giohang WHERE id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $id_user);
    $success = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    return $success;
}

function checkProductQuantity($nameProduct, $quantity)
{
    global $conn;
    $errors = [];
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];

    for ($i = 0; $i < count($nameProduct); $i++) {
        $name = $nameProduct[$i];
        $qty = (int)$quantity[$i];
        $found = false;

        foreach ($tables as $table) {
            $sql = "SELECT quantity FROM $table WHERE name = ? AND is_active = 1";
            $stmt = mysqli_prepare($conn, $sql);
            mysqli_stmt_bind_param($stmt, "s", $name);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_store_result($stmt);

            if (mysqli_stmt_num_rows($stmt) > 0) {
                mysqli_stmt_bind_result($stmt, $currentQty);
                mysqli_stmt_fetch($stmt);
                $found = true;

                if ($currentQty < $qty) {
                    // $errors[] = "Sản phẩm '$name' không đủ số lượng. Hiện có: $currentQty, yêu cầu: $qty.";
                    $errors[] = [
                        'name' => $name,
                        'error' => 'insufficient_quantity'
                    ];
                }
            }

            mysqli_stmt_close($stmt);
            if ($found) break; // Dừng kiểm tra các bảng khác nếu tìm thấy sản phẩm
        }
        if (!$found) {
            $errors[] = [
                'name' => $name,
                'error' => 'product_not_found'
            ];
        }
    }

    return $errors;
}


function checkProductQuantitySize($nameProduct, $quantity, $sizes)
{
    global $conn;
    $tables = [
        "sizequanao",
        "sizegiay"
    ];

    $errors = []; // Mảng lưu các sản phẩm không hợp lệ

    for ($i = 0; $i < count($nameProduct); $i++) {
        $name = $nameProduct[$i];
        $qty = (int)$quantity[$i];
        $size = $sizes[$i];
        $found = false;

        foreach ($tables as $table) {
            $sql = "SELECT quantity FROM $table WHERE name_product = ? AND size = ?";
            $stmt = mysqli_prepare($conn, $sql);
            mysqli_stmt_bind_param($stmt, "ss", $name, $size);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_store_result($stmt);

            if (mysqli_stmt_num_rows($stmt) > 0) {
                mysqli_stmt_bind_result($stmt, $currentQty);
                mysqli_stmt_fetch($stmt);
                $found = true;

                if ($currentQty < $qty) {
                    $errors[] = [
                        'name' => $name,
                        'size' => $size,
                        'error' => 'insufficient_quantity'
                    ];
                }
            }

            mysqli_stmt_close($stmt);
            if ($found) break; // Dừng kiểm tra bảng khác nếu tìm thấy sản phẩm
        }

        if (!$found) {
            $errors[] = [
                'name' => $name,
                'size' => $size,
                'error' => 'product_not_found'
            ];
        }
    }

    // Trả về mảng rỗng nếu không có lỗi
    return $errors;
}



function updateQuantityProduct($nameProduct, $quantity)
{
    global $conn;
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];
    for ($i = 0; $i < count($nameProduct); $i++) {
        $name = $nameProduct[$i];
        $qty = (int)$quantity[$i];

        // Kiểm tra từng bảng xem có chứa sản phẩm đó không
        foreach ($tables as $table) {
            $sql = "UPDATE $table SET quantity = quantity - ? WHERE name = ?";
            $stmt = mysqli_prepare($conn, $sql);
            mysqli_stmt_bind_param($stmt, "is", $qty, $name);
            mysqli_stmt_execute($stmt);

            // Kiểm tra xem có cập nhật được hàng nào không
            if (mysqli_stmt_affected_rows($stmt) > 0) {
                break; // Nếu cập nhật thành công, không cần kiểm tra bảng khác nữa
            }

            mysqli_stmt_close($stmt);
        }
    }
}

function updateSizeProduct($nameProduct, $quantity, $sizes)
{
    global $conn;
    $tables = [
        "sizegiay",
        "sizequanao"
    ];
    for ($i = 0; $i < count($nameProduct); $i++) {
        $name = $nameProduct[$i];
        $qty = (int)$quantity[$i];
        $size = $sizes[$i];

        // Kiểm tra từng bảng xem có chứa sản phẩm đó không
        foreach ($tables as $table) {
            $sql = "UPDATE $table SET quantity = quantity - ? WHERE name_product = ? AND size = ?";
            $stmt = mysqli_prepare($conn, $sql);
            mysqli_stmt_bind_param($stmt, "iss", $qty, $name, $size);
            $result = mysqli_stmt_execute($stmt);

            // Kiểm tra xem có cập nhật được hàng nào không
            if (mysqli_stmt_affected_rows($stmt) > 0) {
                break; // Nếu cập nhật thành công, không cần kiểm tra bảng khác nữa
            }

            mysqli_stmt_close($stmt);
        }
    }
    return $result;
}
function updateInfoUser($fullname, $email, $phone, $address, $user_id)
{
    global $conn;
    $sql = "UPDATE khachhang SET fullname = ?, email = ?, phone = ?, address = ? WHERE id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "ssssi", $fullname, $email, $phone, $address, $user_id);
    $success = $stmt->execute();
    mysqli_stmt_close($stmt);
    return $success;
}
//zxcvb
function verifyUserPassword($user_id, $password)
{
    global $conn;
    $sql = "SELECT password FROM khachhang WHERE id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    if ($row = mysqli_fetch_assoc($result)) {
        return password_verify($password, $row['password']);
    }
    return false;
}
function updateAvatar($new_filename, $user_id)
{
    global $conn;
    $sql = "UPDATE khachhang SET avatar = ? WHERE id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "si", $new_filename, $user_id);
    $success = $stmt->execute();
    mysqli_stmt_close($stmt);
    return $success;
}
function getAllProduct()
{
    $additionalCondition = "quantity > 0 AND is_active = 1";
    global $conn;
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];
    foreach ($tables as $table) {
        $sql = "SELECT id, name, price, oprice, image FROM $table WHERE $additionalCondition";
        $stmt = mysqli_prepare($conn, $sql);
        if (!$stmt) {
            error_log("Error preparing query for table $table: " . mysqli_error($conn));
            continue;
        }
        if (!mysqli_stmt_execute($stmt)) {
            error_log("Error executing query for table $table: " . mysqli_error($conn));
            continue;
        }
        $result = mysqli_stmt_get_result($stmt);

        while ($row = mysqli_fetch_assoc($result)) {
            $products[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'price' => $row['price'],
                'oprice' => $row['oprice'],
                'image' => $row['image'],
                "table_name" => $table
            ];
        }
        mysqli_stmt_close($stmt);
    }
    return $products;
}

function filterProductsByTypeAndBrand($typeFilter, $brandFilter)
{
    global $conn;
    $additionalCondition = "quantity > 0 AND is_active = 1";
    $tables = [];
    switch ($typeFilter) {
        case 'quan_ao_the_thao':
            $tables = ['quanaobongro', 'quanaobongchuyen', 'quanaobongda', 'quanaogym', 'quanaochaybo', 'quanaocaulong', 'aobia'];
            break;
        case 'giay_the_thao':
            $tables = ['giaybongro', 'giaybongda', 'giaybongchuyen', 'giaycaulong', 'giaychaybo', 'giaypickleball', 'giaytapgym'];
            break;
        case 'phu_kien_the_thao':
            $tables = ['phukienbongro', 'phukienbongchuyen', 'phukienbongda', 'phukiengym', 'phukienchaybo', 'phukiencaulong', 'phukienbia', 'phukienpick'];
            break;
        case 'bong_thi_dau':
            $tables = ['quabongro', 'quabongchuyen', 'quabongda'];
            break;
        case 'vot_cau_long':
            $tables = ['votcaulong', 'votpickleball'];
            break;
        default:
            // Lấy tất cả các bảng nếu không có bộ lọc loại sản phẩm
            $tables = [
                'quanaobongro',
                'quanaobongchuyen',
                'quanaobongda',
                'quanaogym',
                'quanaochaybo',
                'quanaocaulong',
                'aobia',
                'giaybongro',
                'giaybongda',
                'giaybongchuyen',
                'giaycaulong',
                'giaychaybo',
                'giaypickleball',
                'giaytapgym',
                'phukienbongro',
                'phukienbongchuyen',
                'phukienbongda',
                'phukiengym',
                'phukienchaybo',
                'phukiencaulong',
                'phukienbia',
                'phukienpick',
                'quabongro',
                'quabongchuyen',
                'quabongda',
                'votcaulong',
                'cauthidau',
                'gaybia',
                'votpickleball'
            ];
    }
    $brandNames = [
        "dongluc" => "Động Lực",
        "grandsport" => "Grand Sport",
        "spalding" => "Spalding",
        "peak" => "Peak",
        "bubadu" => "Bubadu",
        "saovang" => "Sao Vàng",
        "peri" => "Peri",
        "zocker" => "Zocker",
    ];
    $brandFil = [];
    foreach ($brandNames as $key => $brand) {
        if (strpos($brandFilter, $key) !== false) {
            $brandFil  = $brand;
            break;
        }
    }

    $products = [];
    foreach ($tables as $table) {
        $query = "SELECT name, image, price, oprice, brand, '$table' AS table_name FROM $table WHERE $additionalCondition";
        if ($brandFilter) {
            $query .= " AND brand = '" . mysqli_real_escape_string($conn, $brandFil) . "'";
        }
        $result = mysqli_query($conn, $query);
        while ($row = mysqli_fetch_assoc($result)) {
            $products[] = $row;
        }
    }

    return $products;
}

// Lấy tất cả các mục category nav
function getAllNavItems($conn)
{
    $query = "SELECT * FROM category_nav_items ORDER BY position ASC";
    $result = mysqli_query($conn, $query);
    $nav_items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $nav_items[] = $row;
    }
    return $nav_items;
}
// Thêm hoặc cập nhật mục category nav
function saveNavItem($conn, $name, $categories, $position)
{
    // Kiểm tra xem vị trí đã tồn tại chưa
    $check_query = "SELECT id FROM category_nav_items WHERE position = ?";
    $check_stmt = $conn->prepare($check_query);
    $check_stmt->bind_param("i", $position);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    $category_string = implode(',', array_map('trim', $categories));

    if ($check_result->num_rows > 0) {
        // Cập nhật mục hiện có
        $update_query = "UPDATE category_nav_items SET name = ?, category = ? WHERE position = ?";
        $update_stmt = $conn->prepare($update_query);
        $update_stmt->bind_param("ssi", $name, $category_string, $position);
        $success = $update_stmt->execute();
        $update_stmt->close();
    } else {
        // Thêm mục mới
        $insert_query = "INSERT INTO category_nav_items (name, category, position) VALUES (?, ?, ?)";
        $insert_stmt = $conn->prepare($insert_query);
        $insert_stmt->bind_param("ssi", $name, $category_string, $position);
        $success = $insert_stmt->execute();
        $insert_stmt->close();
    }

    $check_stmt->close();
    return $success;
}

// Xóa mục category nav
function deleteNavItem($conn, $id)
{
    $delete_query = "DELETE FROM category_nav_items WHERE id = ?";
    $delete_stmt = $conn->prepare($delete_query);
    $delete_stmt->bind_param("i", $id);
    $success = $delete_stmt->execute();
    $delete_stmt->close();
    return $success;
}

// Lấy danh sách tên category
function getCategoryNames()
{
    return [
        'bongro' => 'Bóng rổ',
        'bongchuyen' => 'Bóng chuyền',
        'bongda' => 'Bóng đá & Futsal',
        'tapgym' => 'Tập Gym & Workout',
        'chaybo' => 'Chạy bộ & Đi bộ',
        'caulong' => 'Cầu lông',
        'bia' => 'Bi-a',
        'pickleball' => 'Pickleball',
        'dongluc' => 'Động Lực',
        'grandsport' => 'Grand Sport',
        'spalding' => 'Spalding',
        'peak' => 'Peak',
        'bubadu' => 'Bubadu',
        'saovang' => 'Sao Vàng',
        'peri' => 'Peri',
        'zocker' => 'Zocker'
    ];
}
// đếm view 
function incrementProductView($table, $product_id)
{
    global $conn;
    $valid_tables = [
        'giaybongro',
        'giaybongchuyen',
        'giaybongda',
        'giaytapgym',
        'giaychaybo',
        'giaycaulong',
        'giaypickleball',
        'quanaobongro',
        'quanaobongchuyen',
        'quanaobongda',
        'quanaogym',
        'quanaochaybo',
        'quanaocaulong',
        'aobia',
        'quabongro',
        'quabongchuyen',
        'quabongda',
        'phukienbongro',
        'phukienbongchuyen',
        'phukienbongda',
        'phukiengym',
        'phukienchaybo',
        'phukiencaulong',
        'phukienbia',
        'phukienpick',
        'votcaulong',
        'cauthidau',
        'gaybia',
        'votpickleball'
    ];
    if (!in_array($table, $valid_tables)) {
        error_log("Invalid table name: $table");
        return false;
    }

    $result = mysqli_query($conn, "SHOW COLUMNS FROM `$table` LIKE 'view'");
    if (!$result || mysqli_num_rows($result) == 0) {
        error_log("Column 'view' does not exist in table: $table");
        return false;
    }

    $sql = "UPDATE `$table` SET view = view + 1 WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        error_log("Error preparing statement: " . mysqli_error($conn));
        return false;
    }
    mysqli_stmt_bind_param($stmt, "i", $product_id);
    $success = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);


    return $success;
}
function getTopViewedProducts($limit = 4)
{
    global $conn;
    $products = [];
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];

    foreach ($tables as $table) {
        $sql = "SELECT id, name, price, oprice, image, view FROM $table WHERE is_active = 1  AND quantity > 0 ORDER BY view DESC LIMIT ?";
        $stmt = mysqli_prepare($conn, $sql);
        if (!$stmt) {
            error_log("Error preparing query for table $table: " . mysqli_error($conn));
            continue;
        }
        mysqli_stmt_bind_param($stmt, "i", $limit);
        if (!mysqli_stmt_execute($stmt)) {
            error_log("Error executing query for table $table: " . mysqli_error($conn));
            continue;
        }
        $result = mysqli_stmt_get_result($stmt);

        while ($row = mysqli_fetch_assoc($result)) {
            $products[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'price' => $row['price'],
                'oprice' => $row['oprice'],
                'image' => $row['image'],
                'table_name' => $table,
                'view' => $row['view']
            ];
        }
        mysqli_stmt_close($stmt);
    }

    // Sắp xếp lại danh sách theo view giảm dần và lấy số lượng giới hạn
    usort($products, function ($a, $b) {
        return $b['view'] - $a['view'];
    });

    return array_slice($products, 0, $limit);
}
function getOrdersPaginated($offset, $itemsPerPage)
{
    global $conn;
    $sql = "SELECT * FROM donhang ORDER BY id ASC LIMIT ?, ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "ii", $offset, $itemsPerPage);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $orders[] = $row;
    }

    return $orders;
}

// Hàm đếm tổng số đơn hàng
function countOrders()
{
    global $conn;
    $count_query = "SELECT COUNT(*) as total FROM donhang";
    $count_result = mysqli_query($conn, $count_query);
    $count_row = $count_result->fetch_assoc();
    return $count_row['total'];
}
//Hàm lấy trạng thái hiện tại của đơn hàng
function getOrderCurrentStatus($orderId)
{
    global $conn;
    $sql = "SELECT trangthai FROM donhang WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return $row['trangthai'];
    }
    return null;
}

// Hàm xóa đơn hàng
function deleteOrder($orderId)
{
    global $conn;
    $conn->begin_transaction();
    try {
        // Xóa chi tiết đơn hàng trước
        $deleteDetails = "DELETE FROM donhangchitiet WHERE iddonhang = ?";
        $stmt = $conn->prepare($deleteDetails);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();

        // Sau đó xóa đơn hàng
        $deleteOrder = "DELETE FROM donhang WHERE id = ?";
        $stmt = $conn->prepare($deleteOrder);
        $stmt->bind_param("i", $orderId);
        $result = $stmt->execute();

        // Commit transaction nếu thành công
        $conn->commit();
        if ($result) {
            return ['success' => true, 'message' => 'Đơn hàng đã được xóa thành công'];
        } else {
            return ['success' => false, 'error' => 'Không thể xóa đơn hàng'];
        }
    } catch (Exception $e) {
        // Rollback nếu có lỗi
        $conn->rollback();
        return ['success' => false, 'error' => 'Lỗi khi xóa đơn hàng: ' . $e->getMessage()];
    }
}

// OrderModel.php
function searchOrders($searchTerm, $offset = 0, $itemsPerPage = 6)
{
    global $conn;

    // Chuẩn bị truy vấn tìm kiếm
    $searchQuery = "SELECT * FROM donhang WHERE 
                    (id LIKE ? OR 
                     fullname LIKE ? OR 
                     phone LIKE ?)
                    ORDER BY id DESC LIMIT ?, ?";

    $stmt = $conn->prepare($searchQuery);

    // Thêm ký tự % để tìm kiếm tương đối
    $searchParam = "%$searchTerm%";
    $stmt->bind_param("sssii", $searchParam, $searchParam, $searchParam, $offset, $itemsPerPage);

    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }

    return $orders;
}

// Hàm đếm tổng số kết quả tìm kiếm
function countSearchOrders($searchTerm)
{
    global $conn;

    $countQuery = "SELECT COUNT(*) as total FROM donhang WHERE 
                   (id LIKE ? OR 
                    fullname LIKE ? OR 
                    phone LIKE ?)";

    $stmt = $conn->prepare($countQuery);
    $searchParam = "%$searchTerm%";
    $stmt->bind_param("sss", $searchParam, $searchParam, $searchParam);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    return $row['total'];
}

// Hàm lấy chi tiết đơn hàng
function getOrderDetail($orderId)
{
    global $conn;

    // Lấy thông tin đơn hàng
    $orderQuery = "SELECT * FROM donhang WHERE id = ?";
    $stmt = $conn->prepare($orderQuery);
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $orderResult = $stmt->get_result();

    if ($orderResult->num_rows > 0) {
        $response = [];
        $response['order'] = $orderResult->fetch_assoc();

        // Lấy chi tiết đơn hàng
        $detailsQuery = "SELECT * FROM donhangchitiet WHERE iddonhang = ?";
        $stmt = $conn->prepare($detailsQuery);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $detailsResult = $stmt->get_result();

        $details = [];
        while ($row = $detailsResult->fetch_assoc()) {
            $details[] = $row;
        }
        $response['details'] = $details;

        return $response;
    } else {
        return ['error' => 'Không tìm thấy đơn hàng'];
    }
}
function updateQuantityProductCancel($nameProduct, $quantity)
{
    global $conn;
    $tables = [
        "giaybongro",
        "giaybongchuyen",
        "giaybongda",
        "giaytapgym",
        "giaychaybo",
        "giaycaulong",
        "giaypickleball",
        "quanaobongro",
        "quanaobongchuyen",
        "quanaobongda",
        "quanaogym",
        "quanaochaybo",
        "quanaocaulong",
        "aobia",
        "quabongro",
        "quabongchuyen",
        "quabongda",
        "phukienbongro",
        "phukienbongchuyen",
        "phukienbongda",
        "phukiengym",
        "phukienchaybo",
        "phukiencaulong",
        "phukienbia",
        "phukienpick",
        "votcaulong",
        "cauthidau",
        "gaybia",
        "votpickleball"
    ];

    $success = true;

    for ($i = 0; $i < count($nameProduct); $i++) {
        $name = $nameProduct[$i];
        $qty = (int)$quantity[$i];
        $updated = false;

        foreach ($tables as $table) {
            $sql = "UPDATE $table SET quantity = quantity + ? WHERE name = ?";
            $stmt = mysqli_prepare($conn, $sql);
            mysqli_stmt_bind_param($stmt, "is", $qty, $name);
            mysqli_stmt_execute($stmt);

            if (mysqli_stmt_affected_rows($stmt) > 0) {
                $updated = true;
                break;
            }

            mysqli_stmt_close($stmt);
        }

        if (!$updated) {
            $success = false;
            // Ghi log lỗi nếu cần
            error_log("Không thể cập nhật số lượng cho sản phẩm: $name");
        }
    }

    return $success;
}
function updateSizeProductCancel($nameProduct, $quantity, $sizes)
{
    global $conn;
    $tables = ["sizegiay", "sizequanao"];
    $success = true;

    for ($i = 0; $i < count($nameProduct); $i++) {
        $name = $nameProduct[$i];
        $qty = (int)$quantity[$i];
        $size = $sizes[$i];
        $updated = false;

        foreach ($tables as $table) {
            $sql = "UPDATE $table SET quantity = quantity + ? WHERE name_product = ? AND size = ?";
            $stmt = mysqli_prepare($conn, $sql);
            mysqli_stmt_bind_param($stmt, "iss", $qty, $name, $size);
            mysqli_stmt_execute($stmt);

            if (mysqli_stmt_affected_rows($stmt) > 0) {
                $updated = true;
                break;
            }

            mysqli_stmt_close($stmt);
        }

        if (!$updated) {
            $success = false;
            // Ghi log lỗi nếu cần
            error_log("Không thể cập nhật size cho sản phẩm: $name, size: $size");
        }
    }

    return $success;
}

function restoreProductStock($orderId)
{
    global $conn;

    // Lấy chi tiết đơn hàng
    $detailsQuery = "SELECT name_product, quantity, size FROM donhangchitiet WHERE iddonhang = ?";
    $stmt = mysqli_prepare($conn, $detailsQuery);
    mysqli_stmt_bind_param($stmt, "i", $orderId);
    mysqli_stmt_execute($stmt);
    $detailsResult = mysqli_stmt_get_result($stmt);

    $nameProducts = [];
    $quantities = [];
    $sizes = [];

    while ($row = mysqli_fetch_assoc($detailsResult)) {
        $nameProducts[] = $row['name_product'];
        $quantities[] = $row['quantity'];
        $sizes[] = $row['size'];
    }
    mysqli_stmt_close($stmt);

    if (empty($nameProducts)) {
        return ['success' => false, 'error' => 'Không tìm thấy chi tiết đơn hàng để hoàn số lượng'];
    }

    // Chuyển đổi số lượng thành giá trị âm để hoàn trả
    $restoreQuantities = array_map(function ($qty) {
        return $qty;
    }, $quantities);
    // Tách danh sách sản phẩm thành hai nhóm: size hợp lệ và không hợp lệ
    $validSizeProducts = [];
    $validSizeQuantities = [];
    $validSizes = [];

    $invalidSizeProducts = [];
    $invalidSizeQuantities = [];

    for ($i = 0; $i < count($nameProducts); $i++) {
        $size = $sizes[$i];
        if (in_array($size, ['N/A', null, '//'], true)) {
            // Size không hợp lệ
            $invalidSizeProducts[] = $nameProducts[$i];
            $invalidSizeQuantities[] = $restoreQuantities[$i];
        } else {
            // Size hợp lệ
            $validSizeProducts[] = $nameProducts[$i];
            $validSizeQuantities[] = $restoreQuantities[$i];
            $validSizes[] = $size;
        }
    }

    $allSuccess = true;
    $errors = [];

    // Cập nhật số lượng cho các sản phẩm có size không hợp lệ (chỉ gọi updateQuantityProductCancel)
    if (!empty($invalidSizeProducts)) {
        $invalidQuantityResult = updateQuantityProductCancel($invalidSizeProducts, $invalidSizeQuantities);
        if (!$invalidQuantityResult) {
            $allSuccess = false;
            $errors[] = 'Lỗi khi hoàn số lượng cho các sản phẩm không có kích thước hợp lệ';
        }
    }

    // Cập nhật số lượng và kích thước cho các sản phẩm có size hợp lệ
    if (!empty($validSizeProducts)) {
        $validQuantityResult = updateQuantityProductCancel($validSizeProducts, $validSizeQuantities);
        $sizeResult = updateSizeProductCancel($validSizeProducts, $validSizeQuantities, $validSizes);

        if (!$validQuantityResult) {
            $allSuccess = false;
            $errors[] = 'Lỗi khi hoàn số lượng cho các sản phẩm có kích thước hợp lệ';
        }
        if (!$sizeResult) {
            $allSuccess = false;
            $errors[] = 'Lỗi khi hoàn số lượng kích thước cho các sản phẩm có kích thước hợp lệ';
        }
    }

    if ($allSuccess) {
        return ['success' => true, 'message' => 'Hoàn số lượng sản phẩm thành công'];
    } else {
        return ['success' => false, 'error' => implode('; ', $errors)];
    }

    // $quantityResult = updateQuantityProductCancel($nameProducts, $restoreQuantities);
    // $sizeResult = updateSizeProductCancel($nameProducts, $restoreQuantities, $sizes);

    // if ($quantityResult && $sizeResult) {
    //     return ['success' => true, 'message' => 'Hoàn số lượng sản phẩm và kích thước thành công'];
    // } else {
    //     return ['success' => false, 'error' => 'Lỗi khi hoàn số lượng sản phẩm hoặc kích thước'];
    // }
    // Kiểm tra xem tất cả size có phải là N/A, null, hoặc // không

}
// Hàm cập nhật trạng thái đơn hàng
function updateOrderStatus($orderId, $newStatus)
{
    global $conn;

    $statusMap = [
        'new' => 'Đang xử lý',
        'shipping' => 'Đang giao',
        'completed' => 'Đã giao',
        'cancelled' => 'Đã hủy'
    ];

    $statusText = $statusMap[$newStatus] ?? $newStatus;

    $conn->begin_transaction();

    try {
        // Cập nhật trạng thái đơn hàng
        $updateQuery = "UPDATE donhang SET trangthai = ? WHERE id = ?";
        $stmt = $conn->prepare($updateQuery);
        $stmt->bind_param("si", $statusText, $orderId);
        $result = $stmt->execute();

        if (!$result) {
            throw new Exception('Không thể cập nhật trạng thái đơn hàng');
        }

        // Nếu trạng thái là "Đã hủy", hoàn số lượng sản phẩm và kích thước
        if ($newStatus === 'cancelled') {
            $restoreResult = restoreProductStock($orderId);
            if (!$restoreResult['success']) {
                throw new Exception($restoreResult['error']);
            }
        }

        // Commit giao dịch
        $conn->commit();
        return ['success' => true, 'message' => 'Cập nhật trạng thái thành công'];
    } catch (Exception $e) {
        // Rollback nếu có lỗi
        $conn->rollback();
        return ['success' => false, 'error' => 'Lỗi khi cập nhập trạng thái: ' . $e->getMessage()];
    }
}
// Thêm vào OrderModel.php
function getFilteredOrdersPaginated($offset, $itemsPerPage, $filter = '', $sort = 'newest')
{
    global $conn;

    // Xây dựng câu SQL cơ bản
    $sql = "SELECT * FROM donhang";

    // Thêm điều kiện lọc trạng thái nếu có
    $whereClause = '';
    if (!empty($filter)) {
        $whereClause = " WHERE trangthai = ?";
    }

    // Thêm sắp xếp theo yêu cầu
    $orderBy = '';
    switch ($sort) {
        case 'oldest':
            $orderBy = " ORDER BY ngaydat ASC";
            break;
        case 'highest':
            $orderBy = " ORDER BY (grandtotal + 0) DESC";
            break;
        case 'lowest':
            $orderBy = " ORDER BY (grandtotal + 0) ASC";
            break;
        case 'newest':
        default:
            $orderBy = " ORDER BY ngaydat DESC";
            break;
    }

    // Thêm phân trang
    $limit = " LIMIT ?, ?";

    // Kết hợp câu SQL hoàn chỉnh
    $sql = $sql . $whereClause . $orderBy . $limit;

    $stmt = mysqli_prepare($conn, $sql);

    // Bind tham số tùy theo có filter hay không
    if (!empty($filter)) {
        mysqli_stmt_bind_param($stmt, "sii", $filter, $offset, $itemsPerPage);
    } else {
        mysqli_stmt_bind_param($stmt, "ii", $offset, $itemsPerPage);
    }

    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $orders[] = $row;
    }

    return $orders;
}
// Hàm đếm số đơn hàng theo trạng thái
function countFilteredOrders($filter)
{
    global $conn;

    $sql = "SELECT COUNT(*) as total FROM donhang WHERE trangthai = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $filter);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    return $row['total'];
}
// qwert
function getAllOrdersForExport($filter = '', $sort = 'newest', $month = null, $year = null)
{
    global $conn;

    $sql = "SELECT * FROM donhang";

    $whereConditions = [];
    $params = [];
    $paramTypes = '';

    if (!empty($filter)) {
        $whereConditions[] = "trangthai = ?";
        $paramTypes .= 's';
        $params[] = $filter;
    }

    if ($month !== null && $year !== null) {
        $whereConditions[] = "MONTH(ngaydat) = ? AND YEAR(ngaydat) = ?";
        $paramTypes .= 'ii';
        $params[] = $month;
        $params[] = $year;
    }

    if (!empty($whereConditions)) {
        $sql .= " WHERE " . implode(" AND ", $whereConditions);
    }

    // Thêm sắp xếp theo yêu cầu
    switch ($sort) {
        case 'oldest':
            $sql .= " ORDER BY ngaydat ASC";
            break;
        case 'highest':
            $sql .= " ORDER BY grandtotal DESC";
            break;
        case 'lowest':
            $sql .= " ORDER BY grandtotal ASC";
            break;
        case 'newest':
        default:
            $sql .= " ORDER BY ngaydat DESC";
            break;
    }

    $stmt = mysqli_prepare($conn, $sql);

    if (!$stmt) {
        // Ghi log lỗi nếu cần
        error_log("Lỗi prepare SQL: " . mysqli_error($conn));
        return [];
    }

    if (!empty($paramTypes)) {
        // Tạo mảng tham số cho bind_param
        $bindParams = [$stmt, $paramTypes];
        foreach ($params as &$param) {
            $bindParams[] = &$param;
        }

        // Gọi bind_param bằng call_user_func_array
        call_user_func_array('mysqli_stmt_bind_param', $bindParams);
    }

    if (!mysqli_stmt_execute($stmt)) {
        error_log("Lỗi execute SQL: " . mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        return [];
    }

    $result = mysqli_stmt_get_result($stmt);
    $orders = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $orders[] = $row;
    }

    mysqli_stmt_close($stmt);
    return $orders;
}
function exportOrdersToExcel($orders)
{
    // Thiết lập header cho file Excel
    header('Content-Type: application/vnd.ms-excel');
    header('Content-Disposition: attachment;filename="danh_sach_don_hang.xls"');
    header('Cache-Control: max-age=0');

    // Bắt đầu xuất dữ liệu
    echo '<table border="1">';
    echo '<tr>';
    echo '<th>Mã ĐH</th>';
    echo '<th>Khách Hàng</th>';
    echo '<th>SĐT</th>';
    echo '<th>Địa Chỉ</th>';
    echo '<th>Tổng Tiền</th>';
    echo '<th>PT Thanh Toán</th>';
    echo '<th>Trạng Thái</th>';
    echo '<th>Ngày Tạo</th>';
    echo '</tr>';

    foreach ($orders as $order) {
        echo '<tr>';
        echo '<td>#' . htmlspecialchars($order['id']) . '</td>';
        echo '<td>' . htmlspecialchars($order['fullname']) . '</td>';
        echo '<td>' . htmlspecialchars($order['phone']) . '</td>';
        echo '<td>' . (!empty($order['address']) ? htmlspecialchars($order['address']) : 'Chưa có địa chỉ') . '</td>';
        echo '<td>' . number_format($order['grandtotal']), ' ₫</td>';
        echo '<td>' . ($order['paymentmethod'] == 'cod' ? 'COD' : 'Chuyển khoản') . '</td>';
        echo '<td>' . htmlspecialchars($order['trangthai']) . '</td>';
        echo '<td>' . (!empty($order['ngaydat']) ? date('d/m/Y H:i', strtotime($order['ngaydat'])) : 'N/A') . '</td>';
        echo '</tr>';
    }

    echo '</table>';
}
// Hàm lấy danh sách voucher với phân trang
function getVouchersPaginated($offset, $itemsPerPage, $filter = '', $sort = 'newest')
{
    global $conn;

    // Xây dựng câu SQL cơ bản
    $sql = "SELECT * FROM voucher";

    // Thêm điều kiện lọc trạng thái nếu có
    $whereClause = '';
    if (!empty($filter)) {
        if ($filter == 'active') {
            $whereClause = " WHERE active = 1";
        } elseif ($filter == 'inactive') {
            $whereClause = " WHERE active = 0";
        }
    }

    // Thêm sắp xếp theo yêu cầu
    $orderBy = '';
    switch ($sort) {
        case 'oldest':
            $orderBy = " ORDER BY id ASC";
            break;
        case 'highest':
            $orderBy = " ORDER BY CASE WHEN price = 'FREESHIP' THEN 0 ELSE CAST(price AS DECIMAL(10,2)) END DESC";
            break;
        case 'lowest':
            $orderBy = " ORDER BY CASE WHEN price = 'FREESHIP' THEN 999999 ELSE CAST(price AS DECIMAL(10,2)) END ASC";
            break;
        case 'newest':
        default:
            $orderBy = " ORDER BY id DESC";
            break;
    }

    // Thêm phân trang
    $limit = " LIMIT ?, ?";

    // Kết hợp câu SQL hoàn chỉnh
    $sql = $sql . $whereClause . $orderBy . $limit;

    $stmt = mysqli_prepare($conn, $sql);

    // Bind tham số
    mysqli_stmt_bind_param($stmt, "ii", $offset, $itemsPerPage);

    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $vouchers = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $vouchers[] = $row;
    }

    return $vouchers;
}

// Hàm đếm tổng số voucher
function countVouchers($filter = '')
{
    global $conn;

    $sql = "SELECT COUNT(*) as total FROM voucher";

    // Thêm điều kiện lọc trạng thái nếu có
    if (!empty($filter)) {
        if ($filter == 'active') {
            $sql .= " WHERE active = 1";
        } elseif ($filter == 'inactive') {
            $sql .= " WHERE active = 0";
        }
    }

    $result = mysqli_query($conn, $sql);
    $row = mysqli_fetch_assoc($result);
    return $row['total'];
}

// Hàm tìm kiếm voucher
function searchVouchers($searchTerm, $offset = 0, $itemsPerPage = 6)
{
    global $conn;

    // Chuẩn bị truy vấn tìm kiếm với JOIN để lấy username
    $searchQuery = "SELECT v.* FROM voucher v 
                    LEFT JOIN khachhang k ON v.id_user = k.id_user 
                    WHERE (v.name LIKE ? OR 
                           v.title LIKE ? OR 
                           k.username LIKE ?)
                    ORDER BY v.id DESC LIMIT ?, ?";

    $stmt = $conn->prepare($searchQuery);

    // Thêm ký tự % để tìm kiếm tương đối
    $searchParam = "%$searchTerm%";
    $stmt->bind_param("sssii", $searchParam, $searchParam, $searchParam, $offset, $itemsPerPage);

    $stmt->execute();
    $result = $stmt->get_result();

    $vouchers = [];
    while ($row = $result->fetch_assoc()) {
        $vouchers[] = $row;
    }

    return $vouchers;
}

// Hàm đếm tổng số kết quả tìm kiếm voucher
function countSearchVouchers($searchTerm)
{
    global $conn;

    $countQuery = "SELECT COUNT(*) as total FROM voucher v 
                   LEFT JOIN khachhang k ON v.id_user = k.id_user 
                   WHERE (v.name LIKE ? OR 
                          v.title LIKE ? OR 
                          k.username LIKE ?)";

    $stmt = $conn->prepare($countQuery);
    $searchParam = "%$searchTerm%";
    $stmt->bind_param("sss", $searchParam, $searchParam, $searchParam);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    return $row['total'];
}

// Hàm thêm voucher mới
function addVoucher($title, $content, $name, $price, $id_user, $active)
{
    global $conn;
    try {
        $price = strtoupper($price) === 'FREESHIP' ? 'FREESHIP' : (is_numeric($price) ? $price : 0);




        // Kiểm tra xem mã voucher đã tồn tại chưa
        $check_query = "SELECT id FROM voucher WHERE name = ?";
        $check_stmt = $conn->prepare($check_query);
        $check_stmt->bind_param("s", $name);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();



        $sql = "INSERT INTO voucher (title, content, name, price, id_user, active) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssii", $title, $content, $name, $price, $id_user, $active);
        $stmt->execute();
        return ['success' => true, 'message' => 'Thêm voucher thành công'];
    } catch (Exception $e) {
        return ['success' => false, 'error' => 'Lỗi thêm voucher: ' . $e->getMessage()];
    }
}

// Hàm xóa voucher
function deleteVoucher($voucherId)
{
    global $conn;

    $sql = "DELETE FROM voucher WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $voucherId);

    if ($stmt->execute()) {
        return ['success' => true, 'message' => 'Voucher đã được xóa thành công'];
    } else {
        return ['success' => false, 'error' => 'Không thể xóa voucher: ' . $conn->error];
    }
}

// Hàm bật/tắt trạng thái voucher
function toggleVoucherStatus($voucherId, $status)
{
    global $conn;

    $sql = "UPDATE voucher SET active = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $status, $voucherId);

    if ($stmt->execute()) {
        return ['success' => true, 'message' => 'Cập nhật trạng thái voucher thành công'];
    } else {
        return ['success' => false, 'error' => 'Không thể cập nhật trạng thái voucher: ' . $conn->error];
    }
}
function getParentTables()
{
    global $conn;
    $parent_tables = [];

    $parent_query = "SELECT topic_id, topic FROM sanpham";
    $parent_result = mysqli_query($conn, $parent_query);

    while ($row = mysqli_fetch_assoc($parent_result)) {
        $parent_tables[$row['topic_id']] = $row['topic'];
    }

    return $parent_tables;
}

// Lấy danh mục con (child tables) dựa trên parent_id
function getChildTables($parent_id)
{
    $table_mapping = [
        1 => ['quanaobongro', 'giaybongro', 'phukienbongro', 'quabongro'],
        2 => ['quanaobongchuyen', 'giaybongchuyen', 'phukienbongchuyen', 'quabongchuyen'],
        3 => ['quanaobongda', 'giaybongda', 'phukienbongda', 'quabongda'],
        4 => ['quanaogym', 'giaytapgym', 'phukiengym'],
        5 => ['quanaochaybo', 'giaychaybo', 'phukienchaybo'],
        6 => ['quanaocaulong', 'giaycaulong', 'phukiencaulong', 'votcaulong', 'cauthidau'],
        7 => ['aobia', 'gaybia', 'phukienbia'],
        8 => ['votpickleball', 'giaypickleball', 'phukienpick']
    ];

    return isset($table_mapping[$parent_id]) ? $table_mapping[$parent_id] : [];
}

// Lấy danh sách sản phẩm từ bảng được chọn
function getProducts($table, $show_inactive = false)
{
    global $conn;
    $products = [];

    // Danh sách bảng được phép
    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    // Kiểm tra bảng có hợp lệ không
    if (!in_array($table, $allowed_tables)) {
        return $products;
    }

    $is_active = $show_inactive ? 0 : 1;
    $sql = "SELECT * FROM $table WHERE is_active = $is_active";
    $result = mysqli_query($conn, $sql);

    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $products[] = $row;
        }
    }

    return $products;
}

// Ẩn sản phẩm 
function hideProduct($table, $product_id)
{
    global $conn;

    // Danh sách bảng được phép
    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    if (!in_array($table, $allowed_tables)) {
        return false;
    }

    $stmt = $conn->prepare("UPDATE $table SET is_active = 0 WHERE id = ?");
    $stmt->bind_param("i", $product_id);

    if ($stmt->execute()) {
        return true;
    } else {
        return false;
    }
}

// Khôi phục sản phẩm 
function restoreProduct($table, $product_id)
{
    global $conn;

    // Danh sách bảng được phép
    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    if (!in_array($table, $allowed_tables)) {
        return false;
    }

    $stmt = $conn->prepare("UPDATE $table SET is_active = 1 WHERE id = ?");
    $stmt->bind_param("i", $product_id);

    if ($stmt->execute()) {
        return true;
    } else {
        return false;
    }
}

// Định dạng tên hiển thị
function formatDisplayName($table)
{
    return str_replace(
        ['quanao', 'giay', 'phukien', 'aobia', 'gaybia', 'vot', 'qua', 'bongro', 'bongchuyen', 'bongda', 'tap', 'chaybo', 'caulong'],
        ['Quần áo ', 'Giày ', 'Phụ kiện ', 'Áo bi-a ', 'Gậy bi-a ', 'Vợt ', 'Quả ', 'bóng rổ', 'bóng chuyền', 'bóng đá', 'tập ', 'chạy bộ', 'cầu lông'],
        $table
    );
}
// Thêm vào cuối file model/ProductModel.php

// Lấy thông tin chi tiết sản phẩm theo ID
function getProductById($table, $product_id)
{
    global $conn;

    // Danh sách bảng được phép
    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    if (!in_array($table, $allowed_tables)) {
        return null;
    }

    $stmt = $conn->prepare("SELECT * FROM $table WHERE id = ?");
    $stmt->bind_param("i", $product_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }

    return null;
}

// Lấy kích thước của sản phẩm (nếu có)
function getProductSizes($table, $product_id)
{
    global $conn;
    $sizes = [];

    $size_table = '';
    if (strpos($table, 'giay') !== false) {
        $size_table = 'sizegiay';
    } elseif (strpos($table, 'quanao') !== false || $table === 'aobia') {
        $size_table = 'sizequanao';
    }

    if (!empty($size_table)) {
        $stmt = $conn->prepare("SELECT size, quantity FROM $size_table WHERE table_name = ? AND parent_id = ?");
        $stmt->bind_param("si", $table, $product_id);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($size_row = $result->fetch_assoc()) {
            $sizes[] = $size_row;
        }
    }

    return $sizes;
}

// Cập nhật thông tin sản phẩm
function updateProduct($table, $product_id, $data, $image_info = [])
{
    global $conn;
    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    if (!in_array($table, $allowed_tables)) {
        return false;
    }

    try {
        $conn->begin_transaction();
        $name = $data['name'];
        $brand = $data['brand'];
        $quantity = $data['quantity'];
        $price = $data['price'];
        $oprice = $data['oprice'];

        $hasWarranty = in_array($table, ['votcaulong', 'votpickleball', 'gaybia']);
        $warranty = isset($data['warranty']) ? $data['warranty'] : '0';

        // Chuẩn bị câu truy vấn dựa trên việc có cập nhật hình ảnh hay không
        $sql = "UPDATE $table SET name=?, brand=?, price=?, oprice=?, quantity=?";
        $params = [$name, $brand, $price, $oprice, $quantity];
        $types = "sssss";

        // Xử lý các trường hình ảnh
        $image_fields = ['image', 'image2', 'image3', 'image4'];
        foreach ($image_fields as $field) {
            if (isset($image_info[$field])) {
                $sql .= ", $field=?";
                $params[] = $image_info[$field];
                $types .= "s";
            }
        }

        // Thêm trường warranty nếu có
        if ($hasWarranty) {
            $sql .= ", warrenty=?";
            $params[] = $warranty;
            $types .= "s";
        }

        $sql .= " WHERE id=?";
        $params[] = $product_id;
        $types .= "i";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);

        if (!$stmt->execute()) {
            throw new Exception("Lỗi cập nhật: " . $stmt->error);
        }

        $conn->commit();
        return true;
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Lỗi cập nhật sản phẩm: " . $e->getMessage());
        return false;
    }
}

function check_id_user($id_user)
{
    global $conn;
    $stmt = $conn->prepare("SELECT id_user FROM khachhang WHERE id_user = ?");
    $stmt->bind_param("i", $id_user);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}


function deleteUserCart($id_user)
{
    global $conn;
    $stmt = $conn->prepare("DELETE FROM giohang WHERE id_user = ?");
    $stmt->bind_param("i", $id_user);
    return $stmt->execute();
}
//qwert
function deleteUserVouchers($id_user)
{
    global $conn;
    $stmt = $conn->prepare("DELETE FROM voucher WHERE id_user = ?");
    $stmt->bind_param("i", $id_user);
    return $stmt->execute();
}

function deleteUser($id_user)
{
    global $conn;
    $stmt = $conn->prepare("DELETE FROM khachhang WHERE id_user = ?");
    $stmt->bind_param("i", $id_user);
    return $stmt->execute();
}


// Cập nhật kích thước sản phẩm
function updateProductSizes($table, $product_id, $sizes, $product_name, $quantities)
{
    global $conn;
    $size_table = '';
    if (strpos($table, 'giay') !== false) {
        $size_table = 'sizegiay';
    } elseif (strpos($table, 'quanao') !== false || $table === 'aobia') {
        $size_table = 'sizequanao';
    }

    if (empty($size_table)) {
        return false;
    }

    try {
        $conn->begin_transaction();
        $stmt = $conn->prepare("DELETE FROM $size_table WHERE table_name = ? AND parent_id = ?");
        $stmt->bind_param("si", $table, $product_id);
        if (!$stmt->execute()) {
            throw new Exception("Lỗi khi xóa size cũ: " . $stmt->error);
        }
        $stmt->close();

        foreach ($sizes as $index => $size) {
            $qty = intval($quantities[$index]);
            if (!empty($size) && $qty > 0) {
                $stmt = $conn->prepare("INSERT INTO $size_table (table_name, parent_id, name_product, size, quantity) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sisss", $table, $product_id, $product_name, $size, $qty);
                if (!$stmt->execute()) {
                    throw new Exception("Lỗi khi thêm size mới: " . $stmt->error);
                }
                $stmt->close();
            }
        }

        $conn->commit();
        return true;
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Lỗi cập nhật size: " . $e->getMessage());
        return false;
    }
}

// Kiểm tra sản phẩm có tồn tại không
function productExists($table, $product_id)
{
    global $conn;

    // Danh sách bảng được phép
    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    if (!in_array($table, $allowed_tables)) {
        return false;
    }

    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM $table WHERE id = ?");
    $stmt->bind_param("i", $product_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    return $row['count'] > 0;
}
// Hàm thêm head banner mới
function addHeadBanner($image_name, $mb_image_name)
{
    global $conn;
    try {
        $stmt = $conn->prepare("INSERT INTO head_banner (image, mb_image) VALUES (?, ?)");
        $stmt->bind_param("ss", $image_name, $mb_image_name);

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Thêm banner thành công!'];
            // move_uploaded_file($image_tmp_name, '../view/img/' . $image_name);
        } else {
            return ['success' => false, 'error' => 'Lỗi khi thêm banner: ' . $stmt->error];
        }
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Hàm xóa head banner
function deleteHeadBanner($id)
{
    global $conn;
    try {
        $stmt = $conn->prepare("DELETE FROM head_banner WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Xóa banner thành công!'];
        } else {
            return ['success' => false, 'error' => 'Lỗi khi xóa banner: ' . $stmt->error];
        }
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Hàm lấy danh sách head banner
function getHeadBanners()
{
    global $conn;
    $banners = [];
    $result = mysqli_query($conn, "SELECT * FROM head_banner ORDER BY id DESC");
    while ($row = mysqli_fetch_assoc($result)) {
        $banners[] = $row;
    }
    return $banners;
}

// Hàm thêm mid banner mới
function addMidBanner($image1, $image2, $image3)
{
    global $conn;
    try {
        $stmt = $conn->prepare("INSERT INTO mid_banner (image1, image2, image3) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $image1, $image2, $image3);

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Thêm mid banner thành công!'];
        } else {
            return ['success' => false, 'error' => 'Lỗi khi thêm mid banner: ' . $stmt->error];
        }
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Hàm xóa mid banner
function deleteMidBanner($id)
{
    global $conn;
    try {
        $stmt = $conn->prepare("DELETE FROM mid_banner WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Xóa mid banner thành công!'];
        } else {
            return ['success' => false, 'error' => 'Lỗi khi xóa mid banner: ' . $stmt->error];
        }
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Hàm lấy danh sách mid banner
function getMidBanners()
{
    global $conn;
    $banners = [];
    $result = mysqli_query($conn, "SELECT * FROM mid_banner ORDER BY id DESC");
    while ($row = mysqli_fetch_assoc($result)) {
        $banners[] = $row;
    }
    return $banners;
}

// Hàm thêm foot banner mới
function addFootBanner($image_name)
{
    global $conn;
    try {
        $stmt = $conn->prepare("INSERT INTO foot_banner (image) VALUES (?)");
        $stmt->bind_param("s", $image_name);

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Thêm foot banner thành công!'];
        } else {
            return ['success' => false, 'error' => 'Lỗi khi thêm foot banner: ' . $stmt->error];
        }
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Hàm xóa foot banner
function deleteFootBanner($id)
{
    global $conn;
    try {
        $stmt = $conn->prepare("DELETE FROM foot_banner WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'Xóa foot banner thành công!'];
        } else {
            return ['success' => false, 'error' => 'Lỗi khi xóa foot banner: ' . $stmt->error];
        }
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Hàm lấy danh sách foot banner
function getFootBanners()
{
    global $conn;
    $banners = [];
    $result = mysqli_query($conn, "SELECT * FROM foot_banner ORDER BY id DESC");
    while ($row = mysqli_fetch_assoc($result)) {
        $banners[] = $row;
    }
    return $banners;
}

// Hàm kiểm tra file ảnh
function validateImageFile($file, $fieldName)
{
    if (!isset($file) || $file['error'] != UPLOAD_ERR_OK) {
        return ['success' => false, 'error' => "Vui lòng chọn hình ảnh $fieldName"];
    }

    $imageFileType = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $check = getimagesize($file['tmp_name']);
    if ($check === false) {
        return ['success' => false, 'error' => "File $fieldName không phải là ảnh hợp lệ"];
    }

    if ($file['size'] > 2000000) {
        return ['success' => false, 'error' => "Kích thước file $fieldName tối đa là 2MB"];
    }

    $allowed_types = ['jpg', 'png', 'jpeg', 'gif', 'webp'];
    if (!in_array($imageFileType, $allowed_types)) {
        return ['success' => false, 'error' => "Chỉ chấp nhận file ảnh JPG, JPEG, PNG, GIF hoặc WEBP"];
    }

    return ['success' => true, 'filename' => $file['name']];
}
function update_2fa($two_fa_active, $user_id)
{
    global $conn;
    $sql = "UPDATE khachhang SET active_2fa = ? WHERE id_user = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "ii", $two_fa_active, $user_id);
    $success = mysqli_stmt_execute($stmt);
    return $success;
    mysqli_stmt_close($stmt);
}
function getCustomerCount()
{
    global $conn;

    // Kiểm tra kết nối
    if (!$conn || mysqli_connect_errno()) {
        throw new Exception("Không thể kết nối đến database");
    }

    $query = "SELECT COUNT(*) as total FROM khachhang";
    $result = mysqli_query($conn, $query);

    if (!$result) {
        throw new Exception("Lỗi truy vấn: " . mysqli_error($conn));
    }

    $row = mysqli_fetch_assoc($result);
    return (int)$row['total'];
}

function getProductCount()
{
    global $conn;

    // Kiểm tra kết nối
    if (!$conn || mysqli_connect_errno()) {
        throw new Exception("Không thể kết nối đến database");
    }

    // Truy vấn đếm tổng số sản phẩm từ tất cả các bảng
    $query = "
        SELECT COUNT(*) as total FROM aobia WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM gaybia WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM giaybongchuyen WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM giaybongda WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM giaybongro WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM giaycaulong WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM giaychaybo WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM giaypickleball WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM giaytapgym WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM cauthidau WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukienbia WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukienbongchuyen WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukienbongda WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukienbongro WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukiencaulong WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukienchaybo WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukiengym WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM phukienpick WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quabongchuyen WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quabongda WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quabongro WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quanaobongchuyen WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quanaobongda WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quanaobongro WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quanaocaulong WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quanaochaybo WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM quanaogym WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM votcaulong WHERE is_active = 1
        UNION ALL
        SELECT COUNT(*) FROM votpickleball WHERE is_active = 1
    ";

    $result = mysqli_query($conn, $query);

    if (!$result) {
        throw new Exception("Lỗi truy vấn: " . mysqli_error($conn));
    }

    $total = 0;
    while ($row = mysqli_fetch_assoc($result)) {
        $total += (int)$row['total'];
    }

    return $total;
}

function getRevenueByMonth($month = null, $year = null)
{
    global $conn;

    // Kiểm tra kết nối
    if (!$conn || mysqli_connect_errno()) {
        throw new Exception("Không thể kết nối đến database");
    }

    // Xây dựng điều kiện WHERE
    $where = "WHERE trangthai = 'Đã giao'";

    // Nếu có tháng và năm được chỉ định
    if ($month !== null && $year !== null) {
        $where .= " AND MONTH(ngaydat) = $month AND YEAR(ngaydat) = $year";
    }

    $query = "SELECT 
                SUM(REPLACE(REPLACE(grandtotal, ',', ''), '.', '') * 1) as total_revenue,
                COUNT(*) as order_count
              FROM donhang
              $where";

    $result = mysqli_query($conn, $query);

    if (!$result) {
        throw new Exception("Lỗi truy vấn: " . mysqli_error($conn));
    }

    $row = mysqli_fetch_assoc($result);

    return [
        'revenue' => $row['total_revenue'] ? (int)$row['total_revenue'] : 0,
        'order_count' => (int)$row['order_count']
    ];
}
function getAvailableMonths()
{
    global $conn;

    if (!$conn || mysqli_connect_errno()) {
        throw new Exception("Không thể kết nối đến database");
    }

    $query = "SELECT 
                DISTINCT YEAR(ngaydat) as year, 
                MONTH(ngaydat) as month 
              FROM donhang 
              WHERE trangthai = 'Đã giao'
              ORDER BY year DESC, month DESC";

    $result = mysqli_query($conn, $query);

    if (!$result) {
        throw new Exception("Lỗi truy vấn: " . mysqli_error($conn));
    }

    $months = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $months[] = [
            'year' => (int)$row['year'],
            'month' => (int)$row['month']
        ];
    }

    return $months;
}
function getCanceledOrdersStats($month = null, $year = null)
{
    global $conn;

    // Kiểm tra kết nối
    if (!$conn || mysqli_connect_errno()) {
        throw new Exception("Không thể kết nối đến database");
    }

    // Xây dựng điều kiện WHERE
    $where = "WHERE trangthai = 'Đã hủy'";

    // Nếu có tháng và năm được chỉ định
    if ($month !== null && $year !== null) {
        $where .= " AND MONTH(ngaydat) = $month AND YEAR(ngaydat) = $year";
    }

    $query = "SELECT 
                COUNT(*) as canceled_count,
                SUM(REPLACE(REPLACE(grandtotal, ',', ''), '.', '') * 1) as canceled_amount
              FROM donhang
              $where";

    $result = mysqli_query($conn, $query);

    if (!$result) {
        throw new Exception("Lỗi truy vấn: " . mysqli_error($conn));
    }

    $row = mysqli_fetch_assoc($result);

    return [
        'count' => $row['canceled_count'] ? (int)$row['canceled_count'] : 0,
        'amount' => $row['canceled_amount'] ? (int)$row['canceled_amount'] : 0
    ];
}

//asdfg
function getOrdersByMonth($month, $year, $filter = '', $sort = 'newest', $offset = 0, $itemsPerPage = 6)
{
    global $conn;

    $sql = "SELECT * FROM donhang WHERE MONTH(ngaydat) = ? AND YEAR(ngaydat) = ?";

    // Thêm điều kiện lọc trạng thái nếu có
    if (!empty($filter)) {
        $sql .= " AND trangthai = ?";
    }

    // Thêm sắp xếp
    switch ($sort) {
        case 'oldest':
            $sql .= " ORDER BY ngaydat ASC";
            break;
        case 'highest':
            $sql .= " ORDER BY grandtotal DESC";
            break;
        case 'lowest':
            $sql .= " ORDER BY grandtotal ASC";
            break;
        case 'newest':
        default:
            $sql .= " ORDER BY ngaydat DESC";
            break;
    }

    // Thêm phân trang
    $sql .= " LIMIT ?, ?";

    $stmt = mysqli_prepare($conn, $sql);

    if (!empty($filter)) {
        mysqli_stmt_bind_param($stmt, "iisii", $month, $year, $filter, $offset, $itemsPerPage);
    } else {
        mysqli_stmt_bind_param($stmt, "iiii", $month, $year, $offset, $itemsPerPage);
    }

    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    $orders = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $orders[] = $row;
    }

    return $orders;
}

//qwert
function countOrdersByMonth($month, $year, $filter = '')
{
    global $conn;

    $sql = "SELECT COUNT(*) as total FROM donhang WHERE MONTH(ngaydat) = ? AND YEAR(ngaydat) = ?";

    if (!empty($filter)) {
        $sql .= " AND trangthai = ?";
    }

    $stmt = $conn->prepare($sql);

    if (!empty($filter)) {
        $stmt->bind_param("iis", $month, $year, $filter);
    } else {
        $stmt->bind_param("ii", $month, $year);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    return $row['total'];
}

//thêm bài viết
function themTinTuc($title, $content, $tag_ids)
{
    global $conn;

    // Thêm bài tin tức vào bảng tintuc
    $sql = "INSERT INTO tintuc (title, content) VALUES (?, ?)";
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        die("Lỗi chuẩn bị truy vấn: " . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($stmt, "ss", $title, $content);
    $result = mysqli_stmt_execute($stmt);

    if ($result) {
        // Lấy ID của bài tin tức vừa thêm
        $news_id = mysqli_insert_id($conn);

        // Lưu các tag vào bảng news_tags
        if (!empty($tag_ids)) {
            $sql_tags = "INSERT INTO news_tags (news_id, tag_id) VALUES (?, ?)";
            $stmt_tags = mysqli_prepare($conn, $sql_tags);
            if ($stmt_tags) {
                foreach ($tag_ids as $tag_id) {
                    mysqli_stmt_bind_param($stmt_tags, "ii", $news_id, $tag_id);
                    mysqli_stmt_execute($stmt_tags);
                }
                mysqli_stmt_close($stmt_tags);
            }
        }

        $doc = new DOMDocument();
        @$doc->loadHTML('<?xml encoding="UTF-8">' . $content);

        // Đánh dấu ảnh đầu tiên
        $is_first_image = true;

        // 1. Lấy toàn bộ ảnh (cả trong figure và ngoài figure)
        $all_images = $doc->getElementsByTagName('img');

        foreach ($all_images as $img) {
            $image_url = $img->getAttribute('src');

            // Kiểm tra xem img có nằm trong figure không
            $parent = $img->parentNode;
            $caption = 'Không có chú thích'; // mặc định
            while ($parent !== null) {
                if ($parent->nodeName === 'figure' && $parent instanceof DOMElement) {
                    $figcaptionTags = $parent->getElementsByTagName('figcaption');
                    if ($figcaptionTags->length > 0) {
                        $figcaption = $figcaptionTags->item(0);
                        $captionText = trim(htmlspecialchars($figcaption->nodeValue));
                        if ($captionText !== '') {
                            $caption = $captionText;
                        }
                    }
                    break;
                }
                $parent = $parent->parentNode;
            }

            $is_primary = $is_first_image ? 1 : 0;

            // Lưu vào CSDL
            $sql_image = "INSERT INTO news_images (news_id, image_url, caption, is_primary) VALUES (?, ?, ?, ?)";
            $stmt_image = mysqli_prepare($conn, $sql_image);
            if ($stmt_image) {
                mysqli_stmt_bind_param($stmt_image, "issi", $news_id, $image_url, $caption, $is_primary);
                mysqli_stmt_execute($stmt_image);
                mysqli_stmt_close($stmt_image);
            }

            $is_first_image = false;
        }
    } else {
        echo "Lỗi khi thêm bài viết: " . mysqli_stmt_error($stmt);
    }

    mysqli_stmt_close($stmt);
    return $result;
}

//Ẩn tin tức
function hide_News($news_id)
{
    global $conn;
    $sql = "UPDATE tintuc SET active = 0 WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $news_id);
    $stmt->execute();
    $stmt->close();
}

//Hiện tin tức
function show_News($news_id)
{
    global $conn;
    $sql = "UPDATE tintuc SET active = 1 WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $news_id);
    $stmt->execute();
    $stmt->close();
}
//Xóa tin tức
function delete_News($news_id)
{
    global $conn;

    // Xóa các bản ghi liên quan trong bảng news_images
    $sql_images = "DELETE FROM news_images WHERE news_id = ?";
    $stmt_images = $conn->prepare($sql_images);
    $stmt_images->bind_param("i", $news_id);
    $stmt_images->execute();
    $stmt_images->close();

    // Xóa các bản ghi liên quan trong bảng news_tags
    $sql_tags = "DELETE FROM news_tags WHERE news_id = ?";
    $stmt_tags = $conn->prepare($sql_tags);
    $stmt_tags->bind_param("i", $news_id);
    $stmt_tags->execute();
    $stmt_tags->close();

    // Xóa bản ghi trong bảng tintuc
    $sql = "DELETE FROM tintuc WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $news_id);
    $stmt->execute();
    $stmt->close();
}

//Chỉnh sửa tin tức
function updateNews($news_id, $title, $content, $tag_ids)
{
    global $conn;

    // Cập nhật bài tin tức
    $sql = "UPDATE tintuc SET title = ?, content = ? WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        die("Lỗi chuẩn bị truy vấn: " . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($stmt, "ssi", $title, $content, $news_id);
    $result = mysqli_stmt_execute($stmt);

    if ($result) {
        // Xóa các tag cũ
        $sql_delete_tags = "DELETE FROM news_tags WHERE news_id = ?";
        $stmt_delete_tags = mysqli_prepare($conn, $sql_delete_tags);
        mysqli_stmt_bind_param($stmt_delete_tags, "i", $news_id);
        mysqli_stmt_execute($stmt_delete_tags);
        mysqli_stmt_close($stmt_delete_tags);

        // Thêm các tag mới
        if (!empty($tag_ids)) {
            $sql_tags = "INSERT INTO news_tags (news_id, tag_id) VALUES (?, ?)";
            $stmt_tags = mysqli_prepare($conn, $sql_tags);
            if ($stmt_tags) {
                foreach ($tag_ids as $tag_id) {
                    mysqli_stmt_bind_param($stmt_tags, "ii", $news_id, $tag_id);
                    mysqli_stmt_execute($stmt_tags);
                }
                mysqli_stmt_close($stmt_tags);
            }
        }

        // Phân tích nội dung để cập nhật hình ảnh
        $doc = new DOMDocument();
        @$doc->loadHTML('<?xml encoding="UTF-8">' . $content); // @ để bỏ qua lỗi HTML không hợp lệ
        $is_first_image = true;
        // Xóa hình ảnh cũ
        $sql_delete_images = "DELETE FROM news_images WHERE news_id = ?";
        $stmt_delete_images = mysqli_prepare($conn, $sql_delete_images);
        mysqli_stmt_bind_param($stmt_delete_images, "i", $news_id);
        mysqli_stmt_execute($stmt_delete_images);
        mysqli_stmt_close($stmt_delete_images);

        $all_images = $doc->getElementsByTagName('img');

        foreach ($all_images as $img) {
            $image_url = $img->getAttribute('src');

            // Kiểm tra xem img có nằm trong figure không
            $parent = $img->parentNode;
            $caption = 'Không có chú thích'; // mặc định
            while ($parent !== null) {
                if ($parent->nodeName === 'figure' && $parent instanceof DOMElement) {
                    $figcaptionTags = $parent->getElementsByTagName('figcaption');
                    if ($figcaptionTags->length > 0) {
                        $figcaption = $figcaptionTags->item(0);
                        $captionText = trim(htmlspecialchars($figcaption->nodeValue));
                        if ($captionText !== '') {
                            $caption = $captionText;
                        }
                    }
                    break;
                }
                $parent = $parent->parentNode;
            }

            $is_primary = $is_first_image ? 1 : 0;

            // Lưu vào CSDL
            $sql_image = "INSERT INTO news_images (news_id, image_url, caption, is_primary) VALUES (?, ?, ?, ?)";
            $stmt_image = mysqli_prepare($conn, $sql_image);
            if ($stmt_image) {
                mysqli_stmt_bind_param($stmt_image, "issi", $news_id, $image_url, $caption, $is_primary);
                mysqli_stmt_execute($stmt_image);
                mysqli_stmt_close($stmt_image);
            }

            $is_first_image = false;
        }
    } else {
        echo "Lỗi khi cập nhật bài viết: " . mysqli_stmt_error($stmt);
    }

    mysqli_stmt_close($stmt);
    return $result;
}

function xoaSanPham($table, $product_id)
{
    global $conn;
    $sql = "DELETE FROM $table WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "i", $product_id);
    $success = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    return $success;
}
function getFeaturedNews($limit = 3)
{
    global $conn;
    $featured_news = [];

    if (!$conn) {
        die("Database connection failed");
    }

    $sql = "SELECT t.*, ni.image_url, ni.caption 
            FROM tintuc t 
            LEFT JOIN news_images ni ON t.id = ni.news_id AND ni.is_primary = 1 
            WHERE t.active = 1
            ORDER BY t.created_at DESC 
            LIMIT ?";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        die("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $limit);
    if (!$stmt->execute()) {
        die("Execute failed: " . $stmt->error);
    }

    // Lấy kết quả từ truy vấn
    $result = $stmt->get_result();

    // Đọc dữ liệu từ kết quả
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $featured_news[] = $row;
        }
    }

    return $featured_news;
}

function getPaginatedNews($featured_ids = [], $current_page = 1, $items_per_page = 5)
{
    global $conn;
    $result = [];

    // Tính offset cho phân trang
    if ($current_page < 1) $current_page = 1;
    $offset = ($current_page - 1) * $items_per_page;

    // Tạo điều kiện loại trừ các bài viết đã xuất hiện trong phần nổi bật
    $exclude_condition = "";
    if (!empty($featured_ids)) {
        $placeholders = str_repeat('?,', count($featured_ids) - 1) . '?';
        $exclude_condition = " WHERE t.id NOT IN ($placeholders) ";
    }

    // Truy vấn tổng số bản ghi (loại trừ bài viết nổi bật)
    $count_sql = "SELECT COUNT(*) as total FROM tintuc t $exclude_condition";
    if (!empty($featured_ids)) {
        $stmt = $conn->prepare($count_sql);
        $types = str_repeat('i', count($featured_ids));
        $stmt->bind_param($types, ...$featured_ids);
        $stmt->execute();
        $total_result = $stmt->get_result();
    } else {
        $total_result = $conn->query($count_sql);
    }

    $total_row = $total_result->fetch_assoc();
    $total_pages = ceil($total_row['total'] / $items_per_page);

    // Truy vấn lấy danh sách tin tức từ database kèm hình ảnh chính, loại trừ các bài viết nổi bật
    $sql = "SELECT t.*, ni.image_url, ni.caption 
            FROM tintuc t 
            LEFT JOIN news_images ni ON t.id = ni.news_id AND ni.is_primary = 1
            $exclude_condition AND t.active =  1
            ORDER BY t.created_at DESC 
            LIMIT ?, ?";

    $stmt = $conn->prepare($sql);

    if (!empty($featured_ids)) {
        $params = array_merge($featured_ids, [$offset, $items_per_page]);
        $types = str_repeat('i', count($featured_ids)) . 'ii';
        $stmt->bind_param($types, ...$params);
    } else {
        $stmt->bind_param("ii", $offset, $items_per_page);
    }

    $stmt->execute();
    $query_result = $stmt->get_result();

    $news = [];
    if ($query_result->num_rows > 0) {
        while ($row = $query_result->fetch_assoc()) {
            $news[] = $row;
        }
    }

    $result['news'] = $news;
    $result['total_pages'] = $total_pages;
    $result['current_page'] = $current_page;

    return $result;
}


function getNewsCategories($limit = 5)
{
    global $conn;
    $categories = [];

    $query = "SELECT * FROM category_nav_items ORDER BY position ASC LIMIT ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
    }

    return $categories;
}

function getSidebarNews($limit = 5)
{
    global $conn;
    $sidebar_news = [];

    $sql = "SELECT t.*, ni.image_url 
            FROM tintuc t 
            LEFT JOIN news_images ni ON t.id = ni.news_id AND ni.is_primary = 1 
            WHERE t.active = 1
            ORDER BY t.created_at DESC 
            LIMIT ?";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $sidebar_news[] = $row;
        }
    }

    return $sidebar_news;
}

function getAllTags()
{
    global $conn;
    $tags = [];

    $tags_sql = "SELECT * FROM tags ORDER BY name ASC";
    $result = $conn->query($tags_sql);

    if ($result->num_rows > 0) {
        while ($tag = $result->fetch_assoc()) {
            $tags[] = $tag;
        }
    }

    return $tags;
}
// Hàm mới cần thêm vào NewsModel.php

function getNewsDetail($id)
{
    global $conn;

    // Truy vấn chi tiết tin tức
    $sql = "SELECT * FROM tintuc WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $news_item = $result->fetch_assoc();

    return $news_item;
}

function getNewsImages($news_id)
{
    global $conn;
    $news_images = [];

    // Lấy các hình ảnh liên quan đến tin tức
    $images_sql = "SELECT * FROM news_images WHERE news_id = ? ORDER BY is_primary DESC, created_at ASC";
    $images_stmt = $conn->prepare($images_sql);
    $images_stmt->bind_param("i", $news_id);
    $images_stmt->execute();
    $images_result = $images_stmt->get_result();

    while ($img = $images_result->fetch_assoc()) {
        $news_images[] = $img;
    }

    return $news_images;
}

function updateNewsViews($id)
{
    global $conn;

    // Tăng số lượt xem
    $update_view = "UPDATE tintuc SET view_count = view_count + 1 WHERE id = ?";
    $stmt = $conn->prepare($update_view);
    $stmt->bind_param("i", $id);
    $stmt->execute();

    return true;
}

function getRelatedNews($exclude_id, $limit = 5)
{
    global $conn;
    $related_news = [];

    // Lấy các tin tức khác cho sidebar
    $related_sql = "SELECT t.id, t.title, t.created_at, ni.image_url 
                    FROM tintuc t 
                    LEFT JOIN news_images ni ON t.id = ni.news_id AND ni.is_primary = 1
                    WHERE t.id != ? AND t.active = 1
                    ORDER BY t.created_at DESC 
                    LIMIT ?";
    $related_stmt = $conn->prepare($related_sql);
    $related_stmt->bind_param("ii", $exclude_id, $limit);
    $related_stmt->execute();
    $related_result = $related_stmt->get_result();

    while ($row = $related_result->fetch_assoc()) {
        $related_news[] = $row;
    }

    return $related_news;
}

function getTagInfo($tag_id)
{
    global $conn;

    $tag_sql = "SELECT name FROM tags WHERE id = ?";
    $tag_stmt = $conn->prepare($tag_sql);
    $tag_stmt->bind_param("i", $tag_id);
    $tag_stmt->execute();
    $tag_result = $tag_stmt->get_result();

    return $tag_result->fetch_assoc();
}

function getNewsByTag($tag_id)
{
    global $conn;
    $news = [];

    $news_sql = "SELECT t.*, ni.image_url, ni.caption 
                FROM tintuc t
                JOIN news_tags nt ON t.id = nt.news_id
                LEFT JOIN news_images ni ON t.id = ni.news_id AND ni.is_primary = 1
                WHERE nt.tag_id = ? AND t.active = 1
                ORDER BY t.created_at DESC";
    $news_stmt = $conn->prepare($news_sql);
    $news_stmt->bind_param("i", $tag_id);
    $news_stmt->execute();
    $news_result = $news_stmt->get_result();

    if ($news_result->num_rows > 0) {
        while ($row = $news_result->fetch_assoc()) {
            $news[] = $row;
        }
    }

    return $news;
}
//qwert
// Hàm tìm kiếm toàn cục trên tất cả các bảng sản phẩm
function searchProductsGlobal($search_keyword, $show_inactive = false)
{
    global $conn;
    $result_products = [];

    if (empty($search_keyword)) {
        return $result_products;
    }

    // Danh sách tất cả các bảng sản phẩm
    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    $is_active = $show_inactive ? 0 : 1;
    $search_term = '%' . mysqli_real_escape_string($conn, $search_keyword) . '%';

    foreach ($allowed_tables as $table) {
        $sql = "SELECT *, '$table' as table_name FROM $table WHERE is_active = $is_active AND name LIKE '$search_term'";
        $result = mysqli_query($conn, $sql);

        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                // Thêm thông tin bảng và tên hiển thị của danh mục vào sản phẩm
                $row['table_display'] = formatDisplayName($table);
                $result_products[] = $row;
            }
        }
    }

    return $result_products;
}
//qwert
function getSearchSuggestions($term)
{
    global $conn;
    $suggestions = [];

    if (empty($term)) {
        return $suggestions;
    }

    $allowed_tables = [
        'quanaobongro',
        'giaybongro',
        'phukienbongro',
        'quabongro',
        'quanaobongchuyen',
        'giaybongchuyen',
        'phukienbongchuyen',
        'quabongchuyen',
        'quanaobongda',
        'giaybongda',
        'phukienbongda',
        'quabongda',
        'quanaogym',
        'giaytapgym',
        'phukiengym',
        'quanaochaybo',
        'giaychaybo',
        'phukienchaybo',
        'quanaocaulong',
        'giaycaulong',
        'phukiencaulong',
        'votcaulong',
        'cauthidau',
        'aobia',
        'gaybia',
        'phukienbia',
        'votpickleball',
        'giaypickleball',
        'phukienpick'
    ];

    $term = mysqli_real_escape_string($conn, $term);

    foreach ($allowed_tables as $table) {
        $sql = "SELECT name, image FROM $table WHERE is_active = 1 AND name LIKE '%$term%' LIMIT 5";
        $result = mysqli_query($conn, $sql);

        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $suggestions[] = [
                    'label' => $row['name'] . ' (' . formatDisplayName($table) . ')',
                    'value' => $row['name'],
                    'image' => !empty($row['image']) ? $row['image'] : 'default_product.jpg', // Hình ảnh mặc định
                    'table' => $table
                ];
            }
        }
    }

    // Loại bỏ các gợi ý trùng lặp
    $unique_suggestions = [];
    $seen = [];
    foreach ($suggestions as $suggestion) {
        if (!in_array($suggestion['value'], $seen)) {
            $unique_suggestions[] = $suggestion;
            $seen[] = $suggestion['value'];
        }
    }

    return array_slice($unique_suggestions, 0, 10); // Giới hạn 10 gợi ý
}


// Thêm vào OrderModel.php
function exportInvoiceToPDF($orderDetail)
{
    // Tạo đối tượng TCPDF
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);

    // Thiết lập thông tin tài liệu
    $pdf->SetCreator('NHL Sports');
    $pdf->SetAuthor('NHL Sports');
    $pdf->SetTitle('Hóa đơn #' . $orderDetail['order']['id']);
    $pdf->SetSubject('Hóa đơn bán hàng');

    // Bỏ header và footer mặc định
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);

    // Thêm một trang mới
    $pdf->AddPage();

    // Thiết lập font
    $pdf->SetFont('dejavusans', '', 10);

    // Logo công ty
    $logo = '../img/logo3.webp'; // Đường dẫn đến logo
    if (file_exists($logo)) {
        $pdf->Image($logo, 10, 10, 30, 0, '', '', 'T', false, 300, '', false, false, 0, false, false, false);
    }

    // Thông tin công ty
    $pdf->SetY(15);
    $pdf->SetX(45);
    $pdf->SetFont('dejavusans', 'B', 14);
    $pdf->Cell(0, 0, 'NHL SPORTS', 0, 1, 'L');
    $pdf->SetX(45);
    $pdf->SetFont('dejavusans', '', 10);
    $pdf->Cell(0, 10, 'Địa chỉ: 19 Nguyễn Hữu thọ, Tân Quy, Q7, Tphcm', 0, 1, 'L');
    $pdf->SetX(45);
    $pdf->Cell(0, 0, 'Điện thoại: 0777566324', 0, 1, 'L');
    $pdf->SetX(45);
    $pdf->Cell(0, 10, 'Email: nhatnam161005@gmail.com', 0, 1, 'L');

    // Tiêu đề hóa đơn
    $pdf->SetY(50);
    $pdf->SetFont('dejavusans', 'B', 16);
    $pdf->Cell(0, 0, 'HÓA ĐƠN BÁN HÀNG', 0, 1, 'C');
    $pdf->Ln(5);

    // Thông tin đơn hàng
    $pdf->SetFont('dejavusans', '', 10);
    $pdf->Cell(40, 7, 'Mã đơn hàng:', 0, 0, 'L');
    $pdf->Cell(0, 7, '#' . $orderDetail['order']['id'], 0, 1, 'L');
    $pdf->Cell(40, 7, 'Ngày đặt:', 0, 0, 'L');
    $pdf->Cell(0, 7, date('d/m/Y H:i', strtotime($orderDetail['order']['ngaydat'])), 0, 1, 'L');
    $pdf->Cell(40, 7, 'Trạng thái:', 0, 0, 'L');
    $pdf->Cell(0, 7, $orderDetail['order']['trangthai'], 0, 1, 'L');
    $pdf->Ln(5);

    // Thông tin khách hàng
    $pdf->SetFont('dejavusans', 'B', 12);
    $pdf->Cell(0, 7, 'Thông tin khách hàng', 0, 1, 'L');
    $pdf->SetFont('dejavusans', '', 10);
    $pdf->Cell(40, 7, 'Họ tên:', 0, 0, 'L');
    $pdf->Cell(0, 7, $orderDetail['order']['fullname'], 0, 1, 'L');
    $pdf->Cell(40, 7, 'Điện thoại:', 0, 0, 'L');
    $pdf->Cell(0, 7, $orderDetail['order']['phone'], 0, 1, 'L');
    $pdf->Cell(40, 7, 'Địa chỉ:', 0, 0, 'L');
    $pdf->Cell(0, 7, $orderDetail['order']['address'], 0, 1, 'L');
    $pdf->Ln(5);

    // Chi tiết sản phẩm
    $pdf->SetFont('dejavusans', 'B', 12);
    $pdf->Cell(0, 7, 'Chi tiết đơn hàng', 0, 1, 'L');

    // Header bảng
    $pdf->SetFillColor(240, 240, 240);
    $pdf->SetFont('dejavusans', 'B', 10);
    $pdf->Cell(80, 7, 'Sản phẩm', 1, 0, 'L', 1); // Giảm độ rộng cột sản phẩm
    $pdf->Cell(20, 7, 'Size', 1, 0, 'C', 1);
    $pdf->Cell(20, 7, 'SL', 1, 0, 'C', 1);
    $pdf->Cell(30, 7, 'Đơn giá', 1, 0, 'R', 1);
    $pdf->Cell(30, 7, 'Thành tiền', 1, 1, 'R', 1);

    // Nội dung bảng
    $pdf->SetFont('dejavusans', '', 9);
    foreach ($orderDetail['details'] as $item) {
        $total = $item['price'] * $item['quantity'];

        // Rút gọn tên sản phẩm nếu quá dài (giới hạn 30 ký tự)
        $productName = $item['name_product'];
        if (mb_strlen($productName, 'UTF-8') > 40) {
            $productName = mb_substr($productName, 0, 40, 'UTF-8') . '...';
        }

        $pdf->Cell(80, 7, $productName, 1, 0, 'L');
        $pdf->Cell(20, 7, $item['size'], 1, 0, 'C');
        $pdf->Cell(20, 7, $item['quantity'], 1, 0, 'C');
        $pdf->Cell(30, 7, number_format($item['price']) . 'đ', 1, 0, 'R');
        $pdf->Cell(30, 7, number_format($total) . 'đ', 1, 1, 'R');
    }

    // Tổng thanh toán
    $pdf->SetFont('dejavusans', 'B', 10);
    $pdf->Cell(150, 7, 'Tổng tiền hàng:', 0, 0, 'R');
    $pdf->Cell(30, 7, number_format($orderDetail['order']['totalAll']) . 'đ', 0, 1, 'R');

    $pdf->Cell(150, 7, 'Giảm giá:', 0, 0, 'R');
    $pdf->Cell(30, 7, '-' . number_format($orderDetail['order']['sale']) . 'đ', 0, 1, 'R');

    $pdf->Cell(150, 7, 'Phí vận chuyển:', 0, 0, 'R');
    $pdf->Cell(30, 7, number_format($orderDetail['order']['tienship']) . 'đ', 0, 1, 'R');

    $pdf->SetFont('dejavusans', 'B', 12);
    $pdf->Cell(150, 10, 'Tổng thanh toán:', 0, 0, 'R');
    $pdf->Cell(30, 10, number_format($orderDetail['order']['grandtotal']) . 'đ', 0, 1, 'R');

    // Phương thức thanh toán
    $pdf->SetFont('dejavusans', '', 10);
    $pdf->Cell(0, 7, 'Phương thức thanh toán: ' . ($orderDetail['order']['paymentmethod'] == 'cod' ? 'Tiền mặt khi nhận hàng' : 'Chuyển khoản ngân hàng'), 0, 1, 'L');

    // Ghi chú
    if (!empty($orderDetail['order']['note'])) {
        $pdf->Cell(0, 7, 'Ghi chú: ' . $orderDetail['order']['note'], 0, 1, 'L');
    }

    // Lời cảm ơn
    $pdf->SetY(-30);
    $pdf->SetFont('dejavusans', 'I', 10);
    $pdf->Cell(0, 7, 'Cảm ơn quý khách đã mua hàng tại NHL Sports!', 0, 1, 'C');

    // Xuất file PDF
    $pdf->Output('Hoa_don_' . $orderDetail['order']['id'] . '.pdf', 'D');
    exit();
}

function hideCartItemsByProductName($conn, $product_name)
{

    // Truy vấn cập nhật cột active trong bảng giohang
    $query = "UPDATE giohang SET active = 0 WHERE name = ?";
    $stmt = mysqli_prepare($conn, $query);

    if (!$stmt) {
        return false; // Trả về false nếu chuẩn bị truy vấn thất bại
    }

    // Gắn tham số product_name
    mysqli_stmt_bind_param($stmt, "s", $product_name);
    $result = mysqli_stmt_execute($stmt);

    // Đóng statement
    mysqli_stmt_close($stmt);

    return $result; // Trả về true nếu cập nhật thành công, false nếu thất bại
}

function deleteCartItem($conn, $product_name)
{

    // Truy vấn xóa mục trong bảng giohang
    $query = "DELETE FROM giohang WHERE name = ? ";
    $stmt = mysqli_prepare($conn, $query);

    if (!$stmt) {
        return false; // Trả về false nếu chuẩn bị truy vấn thất bại
    }

    // Gắn tham số
    mysqli_stmt_bind_param($stmt, "s", $product_name);
    $result = mysqli_stmt_execute($stmt);

    // Đóng statement
    mysqli_stmt_close($stmt);

    return $result; // Trả về true nếu xóa thành công, false nếu thất bại
}

function xoaSanPhamTrongBangSize($conn, $product_name)
{
    // Danh sách các bảng cần xóa
    $tables = ['sizequanao', 'sizegiay'];
    $success = false; // Biến để theo dõi trạng thái xóa

    foreach ($tables as $table) {
        // Truy vấn xóa sử dụng cột name_product
        $query = "DELETE FROM $table WHERE name_product = ?";
        $stmt = mysqli_prepare($conn, $query);

        if (!$stmt) {
            error_log("Lỗi chuẩn bị truy vấn cho bảng $table: " . mysqli_error($conn));
            continue; // Bỏ qua bảng này nếu chuẩn bị truy vấn thất bại
        }

        // Gắn tham số
        mysqli_stmt_bind_param($stmt, "s", $product_name);
        $result = mysqli_stmt_execute($stmt);

        // Kiểm tra kết quả xóa
        if ($result) {
            $affected_rows = mysqli_stmt_affected_rows($stmt);
            if ($affected_rows > 0) {
                $success = true; // Đánh dấu xóa thành công nếu ít nhất một bản ghi bị xóa
            }
        } else {
            error_log("Lỗi thực thi truy vấn xóa trong bảng $table: " . mysqli_stmt_error($stmt));
        }

        // Đóng statement
        mysqli_stmt_close($stmt);
    }

    return $success; // Trả về true nếu xóa thành công trong ít nhất một bảng, false nếu không
}
function getAdminId()
{
    global $conn;
    $sql = "SELECT id_user FROM khachhang WHERE username = 'admin' LIMIT 1";
    $result = mysqli_query($conn, $sql);
    if ($row = mysqli_fetch_assoc($result)) {
        return $row['id_user'];
    }
    return null;
}

function checkUsernameExists($username, $exclude_id = null)
{
    global $conn;
    $sql = "SELECT id_user FROM khachhang WHERE username = ?";
    $params = [$username];
    $types = "s";

    if ($exclude_id !== null) {
        $sql .= " AND id_user != ?";
        $params[] = $exclude_id;
        $types .= "i";
    }

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}

function checkEmailExists($email, $exclude_id = null)
{
    global $conn;
    $sql = "SELECT id_user FROM khachhang WHERE email = ?";
    $params = [$email];
    $types = "s";

    if ($exclude_id !== null) {
        $sql .= " AND id_user != ?";
        $params[] = $exclude_id;
        $types .= "i";
    }

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0;
}
