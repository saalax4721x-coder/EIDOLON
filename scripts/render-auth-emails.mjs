import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../supabase/templates/',import.meta.url));
const messages=[
 ['confirmation','Welcome to EIDOLON','Welcome to EIDOLON.','Your company, agents and work in one place. Confirm your email to finish creating your account.','Continue to EIDOLON','confirmation'],
 ['magic-link','Your EIDOLON sign-in link','Welcome back to EIDOLON.','Your workspace is ready when you are. Use this secure link to sign in.','Sign in to EIDOLON','magic_link'],
 ['invite','You’re invited to EIDOLON','Your next chapter starts here.','You have been invited to create an EIDOLON account. Only accept if you recognize and trust this invitation.','Accept invitation','invite'],
 ['recovery','Reset your EIDOLON password','Let’s get you back in.','A password reset was requested for your EIDOLON account. Follow the link only if you made this request.','Reset password','recovery'],
 ['email-change','Confirm your EIDOLON email change','Confirm your new email.','An email change was requested for your EIDOLON account. Use this link only if you requested the change.','Confirm email change','email_change'],
 ['reauthentication','Your EIDOLON verification code','A quick security check.','Use this one-time code to confirm the action you requested in EIDOLON. Do not share it.','code','reauthentication'],
 ['password-changed','Your EIDOLON password changed','Your account security update.','The password on your EIDOLON account was changed. If this was not you, secure your account and contact the operator through the official EIDOLON help page.','notice','password_changed_notification'],
 ['email-changed','Your EIDOLON email changed','Your email was updated.','The email address associated with your EIDOLON account was changed. If this was not you, secure your account and contact the operator through the official EIDOLON help page.','notice','email_changed_notification'],
 ['identity-linked','A sign-in method was added to EIDOLON','A new way into your account.','A sign-in method was linked to your EIDOLON account. If you did not authorize this, review your account security and contact the operator.','notice','identity_linked_notification'],
 ['identity-unlinked','A sign-in method was removed from EIDOLON','Your sign-in methods changed.','A sign-in method was removed from your EIDOLON account. If you did not authorize this, review your account security and contact the operator.','notice','identity_unlinked_notification'],
 ['mfa-enrolled','A verification method was added to EIDOLON','Your security methods changed.','A verification method was added to your EIDOLON account. If this was not you, review your account security and contact the operator.','notice','mfa_factor_enrolled_notification'],
 ['mfa-unenrolled','A verification method was removed from EIDOLON','Your security methods changed.','A verification method was removed from your EIDOLON account. If this was not you, review your account security and contact the operator.','notice','mfa_factor_unenrolled_notification'],
];
const manifest={};
for(const [name,subject,title,body,action,key] of messages){
 const control=action==='code'?'<p style="font-size:32px;font-weight:600;letter-spacing:8px;">{{ .Token }}</p>':action==='notice'?'':`<p style="margin:28px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;border-radius:999px;background:#14151a;color:#fff;padding:13px 24px;text-decoration:none;font-weight:600;">${action} ↗</a></p>`;
 const hint=action==='notice'?'This message records an account security event. It is not a marketing email.':'This link or code works once and expires shortly. For email sign-in, use the same browser where you requested it. If you did not request it, you can ignore this email.';
 const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#f3f2ee;color:#14151a;font-family:Arial,Helvetica,sans-serif;line-height:1.65;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="padding:36px 16px;">
<table role="presentation" style="width:100%;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e1db;border-radius:26px;"><tr><td style="padding:36px;">
<p style="margin:0 0 32px;font-size:22px;font-weight:600;letter-spacing:-1px;">eidolon<span style="color:#b23a0b;"> ↗</span></p>
<h1 style="margin:0 0 20px;font-size:30px;line-height:1.15;letter-spacing:-1px;">${title}</h1>
<p style="color:#5a5c66;">${body}</p>${control}
<p style="font-size:13px;color:#5a5c66;">${hint}</p><p style="margin:28px 0 0;font-size:14px;">The EIDOLON team</p>
</td></tr></table></td></tr></table></body></html>
`;
 fs.writeFileSync(path.join(directory,name+'.html'),html);
 manifest[`mailer_subjects_${key}`]=subject;
 manifest[`mailer_templates_${key}_content`]=name+'.html';
}
fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Rendered ${messages.length} EIDOLON email templates. No hosted settings changed.`);
