import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';

/** Type for module class references */
type ModuleClass = new (...args: unknown[]) => unknown;

/** Helper to flatten nested arrays to a specific depth */
function flattenDeepTyped<T>(arr: unknown[]): T[] {
  return arr.flat(Infinity) as T[];
}

export class BaseExplorerService {
  getModules(
    modulesContainer: Map<string, Module>,
    include: ModuleClass[],
  ): Module[] {
    if (!include || include.length === 0) {
      return [...modulesContainer.values()];
    }
    return this.includeWhitelisted(modulesContainer, include);
  }

  includeWhitelisted(
    modulesContainer: Map<string, Module>,
    include: ModuleClass[],
  ): Module[] {
    const modules = [...modulesContainer.values()];
    return modules.filter(({ metatype }) =>
      include.includes(metatype as ModuleClass),
    );
  }

  flatMap<T>(
    modules: Module[],
    callback: (
      instance: InstanceWrapper,
      moduleRef: Module,
    ) => T | T[] | undefined,
  ): T[] {
    const visitedModules = new Set<Module>();

    const unwrap = (moduleRef: Module): (T | T[] | undefined)[] => {
      // protection from circular recursion
      if (visitedModules.has(moduleRef)) {
        return [];
      } else {
        visitedModules.add(moduleRef);
      }

      const providers = [...moduleRef.providers.values()];
      const defined = providers.map((wrapper) => callback(wrapper, moduleRef));

      const imported: (T | T[] | undefined)[] = moduleRef.imports?.size
        ? [...moduleRef.imports.values()].reduce<(T | T[] | undefined)[]>(
            (prev, cur) => {
              return [...prev, ...unwrap(cur)];
            },
            [],
          )
        : [];

      return [...defined, ...imported];
    };

    const results = flattenDeepTyped<T | undefined>(modules.map(unwrap));
    return results.filter(
      (item): item is T => item !== undefined && item !== null,
    );
  }
}
