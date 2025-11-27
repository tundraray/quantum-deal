import { assignMetadata, PipeTransform, Type } from '@nestjs/common';
import { isNil, isString } from '@nestjs/common/utils/shared.utils';
import { TelegrafParamtype } from '../enums/telegraf-paramtype.enum';
import { PARAM_ARGS_METADATA } from '../telegraf.constants';

export type ParamData = object | string | number;

/** Metadata record type for parameter arguments */
type ParamArgsMetadata = Record<string, unknown>;

export const createTelegrafParamDecorator =
  (paramtype: TelegrafParamtype) =>
  (data?: ParamData): ParameterDecorator =>
  (target, key, index) => {
    if (key === undefined) return;
    const args: ParamArgsMetadata =
      (Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key) as
        | ParamArgsMetadata
        | undefined) ?? {};
    Reflect.defineMetadata(
      PARAM_ARGS_METADATA,
      assignMetadata(args, paramtype, index, data),
      target.constructor,
      key,
    );
  };

export const createTelegrafPipesParamDecorator =
  (paramtype: TelegrafParamtype) =>
  (
    data?: ParamData | PipeTransform | Type<PipeTransform>,
    ...pipes: (Type<PipeTransform> | PipeTransform)[]
  ): ParameterDecorator =>
  (target, key, index) => {
    if (key === undefined) return;
    addPipesMetadata(paramtype, data, pipes, target, key, index);
  };

export const addPipesMetadata = (
  paramtype: TelegrafParamtype,
  data: ParamData | PipeTransform | Type<PipeTransform> | undefined,
  pipes: (Type<PipeTransform> | PipeTransform)[],
  target: object,
  key: string | symbol,
  index: number,
) => {
  const args: ParamArgsMetadata =
    (Reflect.getMetadata(PARAM_ARGS_METADATA, target.constructor, key) as
      | ParamArgsMetadata
      | undefined) ?? {};
  const hasParamData = isNil(data) || isString(data);
  const paramData = hasParamData ? (data ?? undefined) : undefined;
  const paramPipes = hasParamData
    ? pipes
    : [data as PipeTransform | Type<PipeTransform>, ...pipes];

  Reflect.defineMetadata(
    PARAM_ARGS_METADATA,
    assignMetadata(args, paramtype, index, paramData, ...paramPipes),
    target.constructor,
    key,
  );
};
