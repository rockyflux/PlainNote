import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validationFailed } from '../http/errors.js';

/** 打包后与源码下相对路径一致：server/data/sensitive.txt */
export function defaultSensitivePath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../data/sensitive.txt');
}

interface CompiledTerm {
  /** 原始词条（仅内部诊断用，不对外返回） */
  word: string;
  /** 纯 ASCII：整词匹配；含中文等：子串匹配 */
  kind: 'ascii-word' | 'substring';
  needle?: string;
  pattern?: RegExp;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPureAscii(word: string): boolean {
  return /^[\x00-\x7F]+$/.test(word);
}

/**
 * 基于词库的内容过滤器。
 * 命中时不回传具体词条，避免被用来探测与绕过。
 */
export class SensitiveFilter {
  private readonly terms: readonly CompiledTerm[];

  constructor(words: Iterable<string>) {
    const unique = new Set<string>();
    for (const raw of words) {
      const w = raw.trim();
      if (w) unique.add(w);
    }

    const compiled: CompiledTerm[] = [];
    for (const word of unique) {
      if (isPureAscii(word)) {
        compiled.push({
          word,
          kind: 'ascii-word',
          pattern: new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'),
        });
      } else {
        compiled.push({
          word,
          kind: 'substring',
          needle: /[A-Za-z]/.test(word) ? word.toLowerCase() : word,
        });
      }
    }

    // 长词优先
    compiled.sort((a, b) => b.word.length - a.word.length);
    this.terms = compiled;
  }

  get size(): number {
    return this.terms.length;
  }

  static loadFromFile(filePath: string): SensitiveFilter {
    if (!existsSync(filePath)) {
      throw new Error(`敏感词库文件不存在：${filePath}`);
    }
    const text = readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    return new SensitiveFilter(lines);
  }

  /** 返回命中词（仅供内部/日志）；未命中返回 null。 */
  findMatch(text: string): string | null {
    if (!text || this.terms.length === 0) return null;
    const lower = text.toLowerCase();
    for (const term of this.terms) {
      if (term.kind === 'ascii-word') {
        if (term.pattern!.test(text)) return term.word;
      } else if (term.needle === term.word) {
        if (text.includes(term.needle)) return term.word;
      } else if (lower.includes(term.needle!)) {
        return term.word;
      }
    }
    return null;
  }

  /** 校验标题与正文；命中则抛 422。 */
  assertClean(title: string | null | undefined, content: string | undefined): void {
    const parts: string[] = [];
    if (title) parts.push(title);
    if (content) parts.push(content);
    if (parts.length === 0) return;

    const hit = this.findMatch(parts.join('\n'));
    if (!hit) return;

    throw validationFailed(
      { content: '内容包含不允许发布的词汇，请修改后重试' },
      '内容包含敏感词',
    );
  }
}
