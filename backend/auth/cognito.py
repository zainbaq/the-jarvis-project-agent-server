"""
AWS Cognito JWT Token Validation

Uses PyJWT with PyJWKClient for JWKS-based validation.
Caches JWKS keys automatically via PyJWKClient's built-in caching.
"""
import jwt
from jwt import PyJWKClient
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


@dataclass
class CognitoUser:
    """Represents an authenticated Cognito user"""
    sub: str  # Cognito user ID (unique identifier)
    email: Optional[str] = None
    username: Optional[str] = None
    email_verified: bool = False
    cognito_groups: List[str] = field(default_factory=list)
    token_use: str = "access"  # "access" or "id"
    raw_claims: Dict[str, Any] = field(default_factory=dict)


class CognitoTokenValidator:
    """
    Validates Cognito JWT tokens using JWKS

    Features:
    - Automatic JWKS key caching (via PyJWKClient)
    - Validates token signature, expiration, issuer, and audience
    - Extracts user info from token claims
    """

    def __init__(
        self,
        user_pool_id: str,
        region: str,
        client_id: str,
        jwks_url: Optional[str] = None
    ):
        self.user_pool_id = user_pool_id
        self.region = region
        self.client_id = client_id

        # Construct issuer URL
        self.issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"

        # Construct JWKS URL
        self.jwks_url = jwks_url or f"{self.issuer}/.well-known/jwks.json"

        # Initialize PyJWKClient with caching (lazy)
        self._jwk_client: Optional[PyJWKClient] = None

    @property
    def jwk_client(self) -> PyJWKClient:
        """Lazy initialization of JWK client"""
        if self._jwk_client is None:
            self._jwk_client = PyJWKClient(
                self.jwks_url,
                cache_keys=True,
                lifespan=300  # Cache keys for 5 minutes
            )
        return self._jwk_client

    def validate_token(self, token: str) -> CognitoUser:
        """
        Validate a Cognito JWT token and return user info

        Args:
            token: JWT token string (without "Bearer " prefix)

        Returns:
            CognitoUser with extracted claims

        Raises:
            jwt.InvalidTokenError: If token is invalid
            jwt.ExpiredSignatureError: If token is expired
            ValueError: If required claims are missing
        """
        try:
            # Get the signing key from JWKS
            signing_key = self.jwk_client.get_signing_key_from_jwt(token)

            # Decode and validate the token
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=self.issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_iss": True,
                    "require": ["sub", "exp", "iat", "iss"]
                }
            )

            # Validate token_use (should be "access" or "id")
            token_use = claims.get("token_use", "")
            if token_use not in ["access", "id"]:
                raise ValueError(f"Invalid token_use: {token_use}")

            # For access tokens, validate client_id
            if token_use == "access":
                if claims.get("client_id") != self.client_id:
                    raise ValueError("Token client_id does not match")
            # For ID tokens, validate audience
            elif token_use == "id":
                aud = claims.get("aud")
                if aud != self.client_id:
                    raise ValueError("Token audience does not match client_id")

            # Extract user info
            return CognitoUser(
                sub=claims["sub"],
                email=claims.get("email"),
                username=claims.get("cognito:username") or claims.get("username"),
                email_verified=claims.get("email_verified", False),
                cognito_groups=claims.get("cognito:groups", []),
                token_use=token_use,
                raw_claims=claims
            )

        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            raise


# Global validator instance (lazy initialized)
_validator: Optional[CognitoTokenValidator] = None


def get_token_validator() -> Optional[CognitoTokenValidator]:
    """Get the global token validator instance"""
    global _validator
    return _validator


def initialize_token_validator(
    user_pool_id: str,
    region: str,
    client_id: str,
    jwks_url: Optional[str] = None
) -> CognitoTokenValidator:
    """Initialize the global token validator"""
    global _validator
    _validator = CognitoTokenValidator(
        user_pool_id=user_pool_id,
        region=region,
        client_id=client_id,
        jwks_url=jwks_url
    )
    logger.info(f"Cognito token validator initialized for pool: {user_pool_id}")
    return _validator


def is_auth_configured() -> bool:
    """Check if authentication is configured"""
    return _validator is not None
