import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOTE_NOT_FOUND: 'NOTE_NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  /** 可选 Retry-After 秒数（限流场景）。 */
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const rateLimited = (message: string, retryAfterSeconds: number): AppError =>
  new AppError(429, ErrorCode.RATE_LIMITED, message, undefined, retryAfterSeconds);

export const noteNotFound = (): AppError =>
  new AppError(404, ErrorCode.NOTE_NOT_FOUND, '笔记不存在，或链接已失效 / 已被删除');

export const validationFailed = (
  fields: Record<string, string>,
  message = '内容校验失败',
): AppError => new AppError(422, ErrorCode.VALIDATION_FAILED, message, fields);

interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

function buildBody(code: string, message: string, fields?: Record<string, string>): ErrorBody {
  const body: ErrorBody = { error: { code, message } };
  if (fields && Object.keys(fields).length > 0) body.error.fields = fields;
  return body;
}

/** 注册统一错误处理：AppError 透传，Fastify schema 错误转 422，其余 500。 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      if (error.retryAfterSeconds != null && error.retryAfterSeconds > 0) {
        reply.header('Retry-After', String(error.retryAfterSeconds));
      }
      reply.status(error.status).send(buildBody(error.code, error.message, error.fields));
      return;
    }

    // Fastify 内置 schema 校验失败 → 422；JSON 解析失败 → 400
    const maybe = error as {
      statusCode?: number;
      validation?: unknown;
      message?: string;
      code?: string;
    };
    if (maybe.statusCode === 400 && maybe.validation) {
      reply
        .status(422)
        .send(buildBody(ErrorCode.VALIDATION_FAILED, '请求参数校验失败'));
      return;
    }
    if (
      maybe.statusCode === 400 ||
      maybe.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
      (maybe.message && /JSON|Unexpected token|Expected property/i.test(maybe.message))
    ) {
      reply
        .status(400)
        .send(buildBody(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'));
      return;
    }

    app.log.error(error);
    reply
      .status(500)
      .send(buildBody(ErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试'));
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send(buildBody(ErrorCode.NOTE_NOT_FOUND, '资源不存在'));
  });
}
