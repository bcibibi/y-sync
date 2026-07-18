import * as Y from 'yjs';

declare module 'yjs' {

  type MapObject<D extends Record<string, any>> = {
        [K in keyof D]: MapValue<D[K]>;
    };

  type MapValue<SV> =
          SV extends string | number | boolean | Date ? Y.Text :
          SV extends (infer U)[] ? Y.Array<U> :
          SV extends Record<string, any> ? Y.Map<SV> :
          SV extends undefined ? undefined :
          SV extends null ? null :
          Y.AbstractType<SV>;

  interface Text {
    setText(value: string): void;
    getText(): string;
    setDate(value: Date): void;
    getDate(): Date;
    setNumber(value: number): void;
    getNumber(): number;
    setBoolean(value: boolean): void;
    getBoolean(): boolean;
    toHtml?: () => string;
  }
  
  interface Map<MapType extends Record<string, any>> {
    get<V extends keyof MapType>(key: V): MapValue<MapType[V]> | undefined;

    getValue<V extends keyof MapType>(key: V): MapType[V] | undefined;

    set<V extends keyof MapType>(key: V, value: MapType[V]): MapType[V];

    setObject(value: MapType): void;

    has<V extends keyof MapType>(key: V): boolean;

    delete<V extends keyof MapType>(key: V): void;

    values(): IterableIterator<MapValue<MapType[keyof MapType]>>;

    toJSON(): MapType;

    clone(): Y.Map<MapType>;
  }

  interface Array<T> {
    get(index: number): MapValue<T>;

    getValue(index: number): T;

    insert(index: number, value: T[]): void;

    delete(index: number, length?: number): void;

    push(values: T[]): void;

    replace(values: T[]): void;

    toArray(): MapValue<T>[];

    toJSON(): T[];

    clone(): Y.Array<T>;
  }

  interface Doc {
    getMap<MapType extends Record<string, any>>(name: string): Y.Map<MapType>;

    getArray<T>(name: string): Y.Array<T>;
  }
}