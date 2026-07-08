import { ForbiddenException } from '@nestjs/common';

/**
 * Thrown when an operation is forbidden by a hard architectural policy
 * (e.g. physical deletion of S3 objects). Never caught to "work around" — the
 * policy is intentional.
 */
export class ForbiddenByPolicyException extends ForbiddenException {
  constructor(message = 'Operation forbidden by policy') {
    super({ statusCode: 403, error: 'ForbiddenByPolicy', message });
  }
}
