
import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT ? parseInt(process.env.PORT) : 6040,
    nodeEnv: process.env.NODE_ENV || 'local',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    appApiUrl: process.env.APP_API_URL || 'http://localhost:3001',
    db: {
        type: process.env.DB_TYPE || 'postgres',
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/platform',
    },
    cache: {
        // 'memory' (default, per-instance) | 'redis' (shared across instances)
        driver: (process.env.CACHE_DRIVER || 'memory') as 'memory' | 'redis',
        redisUrl: process.env.CACHE_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379',
        // TTL for the (org, role) -> permissions cache.
        roleTtlMs: process.env.ROLE_CACHE_TTL_MS ? parseInt(process.env.ROLE_CACHE_TTL_MS, 10) : 5000,
    },
    mail: {
        smtpAddress: process.env.SMTP_ADDRESS || 'smtp.mailgun.org',
        smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
        smtpUsername: process.env.SMTP_USERNAME || '',
        smtpPassword: process.env.SMTP_PASSWORD || '',
        sender: process.env.SMTP_SENDER || 'noreply@imbrace.co',
    },
    auth: {
        superadminEmail: process.env.IMBRACE_USERNAME,
        superadminPassword: process.env.IMBRACE_PASSWORD,
        superadminEmails: (process.env.SUPERADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(Boolean),
    },
    newOrg: {
        name: process.env.NEW_ORG_NAME,
        username: process.env.NEW_ORG_USERNAME,
        password: process.env.NEW_ORG_PASSWORD,
    },
    services: {
        ai: {
            // SERVICE_AI/v1  — used for most AI calls (files, embedding, etc.)
            baseUrl: process.env.SERVICE_AI || 'http://localhost:3003',
            // SERVICE_AI_V2/api/v1 — used for RAG, document, files/extract
            baseUrlV2: process.env.SERVICE_AI_V2 || 'http://localhost:3004',
        },
        ips: {
            // SERVICE_IPS — IPS/scheduler service (proxied under /v1/organization/:id/ips/*)
            baseUrl: process.env.SERVICE_IPS || 'http://localhost:80',
        },
        dataBoard: {
            // SERVICE_DATA_BOARD — called from CreateOrganization to seed the
            // 6 default CRM boards (legacy Board.generateDefault). Hits
            // POST /api/boards/_seed_default. No auth (internal-only).
            baseUrl: process.env.SERVICE_DATA_BOARD || 'http://localhost:8866',
        },
        channelService: {
            // SERVICE_CHANNEL — channel-service base URL (internal-only, no auth).
            // Used both for audit-revert dispatch (POST /internal/audit/apply-revert)
            // and for posting in-app notifications (POST /internal/notifications).
            baseUrl: process.env.SERVICE_CHANNEL || 'http://localhost:8866',
        },
    },
    // SSO general
    ssoProvider: process.env.SSO_PROVIDER || 'oidc', // 'oidc' | 'ldap' | 'both'

    // Google OAuth2
    googleSSO: {
        clientId: process.env.GOOGLE_CLIENT_ID_SSO || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET_SSO || '',
        callback: process.env.GOOGLE_CALLBACK_URL_SSO || 'http://localhost:3001/v1/sso/google/callback',
    },

    // Microsoft OAuth2
    microsoftSSO: {
        clientId: process.env.MICROSOFT_CLIENT_ID_SSO || process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET_SSO || process.env.MICROSOFT_CLIENT_SECRET || '',
        callback: process.env.MICROSOFT_CALLBACK_URL_SSO || process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3001/v1/sso/microsoft/callback',
    },

    // Azure AD (MSAL) — env var names match backend (_SSO suffix)
    azureAdSSO: {
        clientId: process.env.AZURE_AD_CLIENT_ID_SSO || process.env.AZURE_AD_CLIENT_ID || '',
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET_SSO || process.env.AZURE_AD_CLIENT_SECRET || '',
        tenantId: process.env.AZURE_AD_TENANT_ID_SSO || process.env.AZURE_AD_TENANT_ID || '',
        callback: process.env.AZURE_AD_CALLBACK_URL_SSO || process.env.AZURE_AD_CALLBACK_URL || 'http://localhost:3001/v1/sso/azure_ad/auth/callback',
    },

    // Keycloak (openid-client) — env var names match backend
    keycloakSSO: {
        issuer: process.env.OIDC_ISSUER || 'http://localhost:8080/realms/my-realm',
        clientId: process.env.OIDC_CLIENT_ID || 'my-app-id',
        clientSecret: process.env.OIDC_CLIENT_SECRET || '',
        callback: process.env.OIDC_REDIRECT_URI || process.env.OIDC_CALLBACK_URL || 'http://localhost:3001/v1/sso/keycloak/auth/callback',
    },

    // LDAP
    ldapSSO: {
        url: process.env.LDAP_URL || '',
        bindDn: process.env.LDAP_BIND_DN || '',
        bindPassword: process.env.LDAP_BIND_PASSWORD || '',
        baseDn: process.env.LDAP_BASE_DN || '',
        userSearchBase: process.env.LDAP_USER_SEARCH_BASE || '',
        userSearchFilter: process.env.LDAP_USER_SEARCH_FILTER || '(uid={{username}})',
        groupSearchBase: process.env.LDAP_GROUP_SEARCH_BASE || '',
        groupSearchFilter: process.env.LDAP_GROUP_SEARCH_FILTER || '(member={{dn}})',
        groupNameAttribute: process.env.LDAP_GROUP_NAME_ATTRIBUTE || 'cn',
        useTls: process.env.LDAP_USE_TLS === 'true',
        tlsOptions: {} as Record<string, any>,
    },

    // SAML — per-org trust settings live in DB (saml_idp_config / saml_sp_config).
    // The platform's own signing keypairs are global. PEM values may be supplied on
    // a single env line using literal "\n" sequences for newlines.
    samlSSO: {
        enabled: process.env.SAML_ENABLED === 'true',
        // Origins the SP may redirect back to after the assertion (e.g. the
        // auth-service that initiated SP login via the `relay` param). Open-redirect
        // guard: a relay/RelayState URL is honored only if its origin is listed.
        allowedRelayOrigins: (process.env.SAML_ALLOWED_RELAY_ORIGINS || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        // External base URL for the SAML routes (…/v1/sso/saml). Set this when the
        // service sits behind a gateway that rewrites the path (e.g. /v1/platform/sso/saml),
        // since the SP entityID/ACS can't then be derived from APP_API_URL. When unset,
        // the URLs derive from APP_API_URL as `${APP_API_URL}/v1/sso/saml`.
        spBaseUrl: (process.env.SAML_SP_BASE_URL || '').replace(/\/$/, ''),
        // Trusted external IdP (Phase 1 SP role) — env-based config, mirrors OIDC.
        // When entityId + ssoUrl + cert are all set, the SP uses these instead of the
        // DB saml_idp_config row. (tenantId for role mapping = idp.entityId.)
        idp: {
            entityId: process.env.SAML_IDP_ENTITY_ID || '',
            ssoUrl: process.env.SAML_IDP_SSO_URL || '',
            cert: (process.env.SAML_IDP_CERT || '').replace(/\\n/g, '\n'),
            nameIdFormat: process.env.SAML_IDP_NAME_ID_FORMAT || 'emailAddress',
            emailAttribute: process.env.SAML_IDP_EMAIL_ATTRIBUTE || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
            nameAttribute: process.env.SAML_IDP_NAME_ATTRIBUTE || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
            groupsAttribute: process.env.SAML_IDP_GROUPS_ATTRIBUTE || 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
            wantAssertionsSigned: process.env.SAML_IDP_WANT_ASSERTIONS_SIGNED !== 'false',
        },
        // Platform Service-Provider keypair (Phase 1: sign AuthnRequests / decrypt assertions). Optional.
        spCert: (process.env.SAML_SP_CERT || '').replace(/\\n/g, '\n'),
        spPrivateKey: (process.env.SAML_SP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        // Platform's own IdP signing keypair (Phase 2: sign issued assertions). Named
        // *_SIGNING_* so it doesn't clash with SAML_IDP_CERT (the external IdP's cert above).
        idpSigningCert: (process.env.SAML_IDP_SIGNING_CERT || '').replace(/\\n/g, '\n'),
        idpSigningKey: (process.env.SAML_IDP_SIGNING_KEY || '').replace(/\\n/g, '\n'),
        idpSigningKeyPass: process.env.SAML_IDP_SIGNING_KEY_PASS || undefined,
    },
};
