package com.referai.backend.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.from-address:}")
    private String fromAddress;

    @Value("${spring.mail.username:}")
    private String springMailUsername;

    @Value("${app.mail.from-name:ReferAI}")
    private String fromName;

    @Value("${app.public.frontend-base-url:http://localhost:3001}")
    private String frontendBaseUrl;

    /**
     * Sends login OTP synchronously so the API can surface SMTP failures to the client.
     */
    public void sendLoginOtp(String to, String otp, String recipientDisplayName) {
        if (!mailEnabled) {
            log.warn("[Mail] Skipping login OTP email (app.mail.enabled=false). User must use Redis/dev tooling to retrieve OTP.");
            return;
        }
        JavaMailSender sender = requireSender();
        String safeName = HtmlUtils.htmlEscape(recipientDisplayName != null ? recipientDisplayName : "there");
        String subject = "Your ReferAI sign-in code";
        String html = """
                <!DOCTYPE html>
                <html><head><meta charset="UTF-8"></head>
                <body style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1a1a1a;background:#f6f7fb;padding:24px;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr><td>
                      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">ReferAI</p>
                      <h1 style="margin:0 0 16px;font-size:22px;">Sign-in verification</h1>
                      <p style="margin:0 0 20px;">Hi %s,</p>
                      <p style="margin:0 0 20px;">Use this code to finish signing in. It expires in <strong>5 minutes</strong>.</p>
                      <p style="margin:24px 0;font-size:32px;letter-spacing:8px;font-weight:700;color:#111827;">%s</p>
                      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">If you did not try to sign in, you can ignore this email.</p>
                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                      <p style="margin:0;font-size:12px;color:#9ca3af;">This message was sent by ReferAI. Do not share this code with anyone.</p>
                    </td></tr>
                  </table>
                </body></html>
                """.formatted(safeName, HtmlUtils.htmlEscape(otp));

        try {
            sendMime(sender, to, subject, html);
        } catch (Exception e) {
            throw new IllegalStateException("SMTP send failed for login OTP", e);
        }
        log.info("[Mail] Login OTP sent to {}", maskEmail(to));
    }

    @Async("mailTaskExecutor")
    public void sendReferralRequestNotificationAsync(
            String referrerEmail,
            String referrerName,
            String seekerName,
            String jobTitle,
            String targetCompany,
            java.util.UUID requestId) {
        if (!mailEnabled) {
            return;
        }
        try {
            JavaMailSender sender = mailSenderProvider.getIfAvailable();
            if (sender == null) {
                log.warn("[Mail] JavaMailSender not available; skipping referral notification");
                return;
            }
            String safeReferrer = HtmlUtils.htmlEscape(referrerName != null ? referrerName : "");
            String safeSeeker = HtmlUtils.htmlEscape(seekerName != null ? seekerName : "A candidate");
            String safeTitle = HtmlUtils.htmlEscape(jobTitle != null ? jobTitle : "a role");
            String safeCompany = HtmlUtils.htmlEscape(targetCompany != null ? targetCompany : "");
            
            String jobText = safeTitle;
            if (!safeCompany.isBlank() && !safeTitle.toLowerCase().contains(safeCompany.toLowerCase())) {
                jobText = safeTitle + " at " + safeCompany;
            }

            String link = baseUrl() + "/dashboard/requests";
            String subject = "New referral request on ReferAI";
            String html = """
                    <!DOCTYPE html>
                    <html><head><meta charset="UTF-8"></head>
                    <body style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1a1a1a;background:#f6f7fb;padding:24px;">
                      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                        <tr><td>
                          <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">ReferAI</p>
                          <h1 style="margin:0 0 16px;font-size:22px;">You have a new referral request</h1>
                          <p style="margin:0 0 16px;">Hi %s,</p>
                          <p style="margin:0 0 16px;"><strong>%s</strong> is asking for a referral for <strong>%s</strong>.</p>
                          <p style="margin:24px 0;"><a href="%s" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Review request</a></p>
                          <p style="margin:0;font-size:12px;color:#9ca3af;">Request ID: %s</p>
                        </td></tr>
                      </table>
                    </body></html>
                    """.formatted(safeReferrer, safeSeeker, jobText, HtmlUtils.htmlEscape(link), requestId);

            sendMime(sender, referrerEmail, subject, html);
            log.info("[Mail] Referral request notification sent to {}", maskEmail(referrerEmail));
        } catch (Exception e) {
            log.error("[Mail] Failed to send referral request email: {}", e.getMessage(), e);
        }
    }

    @Async("mailTaskExecutor")
    public void sendNewMessageNotificationAsync(
            String recipientEmail,
            String recipientName,
            String senderName,
            String messagePreview,
            java.util.UUID conversationId) {
        if (!mailEnabled) {
            return;
        }
        try {
            JavaMailSender sender = mailSenderProvider.getIfAvailable();
            if (sender == null) {
                log.warn("[Mail] JavaMailSender not available; skipping message notification");
                return;
            }
            String safeRecipient = HtmlUtils.htmlEscape(recipientName != null ? recipientName : "");
            String safeSender = HtmlUtils.htmlEscape(senderName != null ? senderName : "Someone");
            String preview = messagePreview != null ? messagePreview : "";
            if (preview.length() > 280) {
                preview = preview.substring(0, 277) + "...";
            }
            preview = HtmlUtils.htmlEscape(preview);
            String link = baseUrl() + "/messages/" + conversationId;
            String subject = "New message from " + (senderName != null ? senderName : "ReferAI");
            String html = """
                    <!DOCTYPE html>
                    <html><head><meta charset="UTF-8"></head>
                    <body style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1a1a1a;background:#f6f7fb;padding:24px;">
                      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                        <tr><td>
                          <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">ReferAI</p>
                          <h1 style="margin:0 0 16px;font-size:22px;">New message</h1>
                          <p style="margin:0 0 16px;">Hi %s,</p>
                          <p style="margin:0 0 12px;"><strong>%s</strong> sent you a message:</p>
                          <blockquote style="margin:16px 0;padding:16px;background:#f9fafb;border-left:4px solid #111827;border-radius:0 8px 8px 0;font-size:14px;color:#374151;">%s</blockquote>
                          <p style="margin:24px 0;"><a href="%s" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Open conversation</a></p>
                        </td></tr>
                      </table>
                    </body></html>
                    """.formatted(safeRecipient, safeSender, preview, HtmlUtils.htmlEscape(link));

            sendMime(sender, recipientEmail, subject, html);
            log.info("[Mail] New message notification sent to {}", maskEmail(recipientEmail));
        } catch (Exception e) {
            log.error("[Mail] Failed to send new message email: {}", e.getMessage(), e);
        }
    }

    private JavaMailSender requireSender() {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            throw new IllegalStateException("JavaMailSender is not configured. Set spring.mail.* and ensure mail starter is active.");
        }
        return sender;
    }

    private void sendMime(JavaMailSender sender, String to, String subject, String htmlBody) throws Exception {
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        String from = resolveFromAddress();
        helper.setFrom(new InternetAddress(from, fromName, StandardCharsets.UTF_8.name()));
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        sender.send(message);
    }

    private String resolveFromAddress() {
        if (fromAddress != null && !fromAddress.isBlank()) {
            return fromAddress.trim();
        }
        if (springMailUsername != null && !springMailUsername.isBlank()) {
            return springMailUsername.trim();
        }
        throw new IllegalStateException("No sender address: set MAIL_FROM or MAIL_USERNAME");
    }

    private String baseUrl() {
        String b = frontendBaseUrl == null ? "" : frontendBaseUrl.trim();
        while (b.endsWith("/")) {
            b = b.substring(0, b.length() - 1);
        }
        return b.isEmpty() ? "http://localhost:3001" : b;
    }

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) {
            return "*" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }
}
