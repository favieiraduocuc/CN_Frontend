import {
  BrowserCacheLocation,
  IPublicClientApplication,
  LogLevel,
  PublicClientApplication,
} from '@azure/msal-browser';
import { environment } from '../environments/environment';

const apiBaseUrl = environment.apiUrl;
const clientId = environment.msalClientId;
const tenant = environment.msalTenant;
const userFlow = environment.msalUserflow;
const redirectUri = environment.msalRedirectUri;

const b2cPolicies = {
  names: {
    signUpSignIn: userFlow,
  },
  authorities: {
    signUpSignIn: {
      authority: `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/${userFlow}`,
    },
  },
  authorityDomain: `${tenant}.b2clogin.com`,
};

export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: [b2cPolicies.authorityDomain],
    redirectUri: redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (
        level: LogLevel,
        message: string,
        containsPii: boolean,
      ) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
        }
      },
      logLevel: LogLevel.Verbose,
    },
  },
};

export const loginRequest = {
  scopes: ['openid', 'offline_access', clientId],
};

export const apiConfig = {
  uri: apiBaseUrl,
  scopes: [clientId],
};
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}
