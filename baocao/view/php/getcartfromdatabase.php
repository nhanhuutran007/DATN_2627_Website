<?php
// ../../model/functions.php

if (!function_exists('getCartFromDatabase')) {
    function getCartFromDatabase($conn, $id_user)
    {
        $cart = [];
        $sql = "SELECT image, name, size, price, quantity FROM giohang WHERE id_user = ? AND active = 1";
        $stmt = mysqli_prepare($conn, $sql);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "i", $id_user);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);
            while ($row = mysqli_fetch_assoc($result)) {
                $cart[] = [
                    'image' => $row['image'],
                    'name' => $row['name'],
                    'size' => $row['size'],
                    'price' => $row['price'],
                    'quantity' => $row['quantity']
                ];
            }
            mysqli_stmt_close($stmt);
        } else {
            error_log("Lỗi chuẩn bị truy vấn getCartFromDatabase: " . mysqli_error($conn));
        }
        return $cart;
    }
}
