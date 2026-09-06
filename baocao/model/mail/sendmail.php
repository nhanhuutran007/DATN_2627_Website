<?php
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';
require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/OAuthTokenProvider.php';
require 'PHPMailer/src/OAuth.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendMail($toEmail, $subject, $body)
{
    $mail = new PHPMailer(true);
    try {
        $mail->SMTPDebug = 0;
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'nhatnam161005@gmail.com';
        $mail->Password = 'yvqhroiprluiakmi';
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;

        $mail->setFrom('nhatnam161005@gmail.com', 'NHL Sports');
        $mail->addAddress($toEmail);
        // $mail->addCC('nhatnam161005@gmail.com');

        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = $subject;
        $mail->Body = $body;

        $mail->send();
        return "Message has been sent";
    } catch (Exception $e) {
        return "Message could not be sent. Mailer Error: " . $mail->ErrorInfo;
    }
}
