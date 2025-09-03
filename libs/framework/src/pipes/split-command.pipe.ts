import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SplitCommandPipe implements PipeTransform {
  transform(
    value: string,
  ): [string, string | undefined, string[] | undefined] | undefined {
    if (!value || !value.startsWith('/')) return undefined;

    const [command, arg1, ...args] = value.split(' ');
    if (!args) return undefined;
    return [command, arg1 ?? undefined, args];
  }
}
