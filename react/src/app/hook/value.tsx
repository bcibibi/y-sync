import React from "react";
import * as Y from "yjs";
import equal from 'fast-deep-equal';
import debug from 'debug';

const log = debug('yjs:AbstractTypeHook');

interface UseYOptions {
    deep?: boolean;
}

export function useY<D extends Record<string, any>, K extends keyof D>(value: Y.Map<D> | undefined, key: K, options: UseYOptions): D[K] | undefined;
export function useY<D extends Record<string, any>, K extends keyof D>(value: (Y.Map<D> | undefined)[], key: K, options: UseYOptions): (D[K] | undefined)[];
export function useY<D>(value: Y.Array<D> | undefined, key: number, options: UseYOptions): D | undefined;
export function useY<D>(value: (Y.Array<D> | undefined)[], key: number, options: UseYOptions): (D | undefined)[];
export function useY(value: any, key: any, options?: UseYOptions) {
    const prevDataRef = React.useRef<any | null>(null);

    return React.useSyncExternalStore<any | undefined>(
        (callback) => {
            const values = Array.isArray(value) ? value : [value];

            if (values.length === 0) {
                return () => undefined;
            }

            values.forEach(value => observeYType(value, callback, options?.deep ?? true));

            return () => {
                values.forEach(value => unobserveYType(value, callback, options?.deep ?? true));
            };
        },
        () => {
            let data: any | null = null;
            if (!Array.isArray(value)) {
                data = getValue(value, key);
            } else {
                data = value.map(v => getValue(v, key));
            }

            if (!equal(prevDataRef.current, data)) {
                prevDataRef.current = data;
            }

            return prevDataRef.current;
        },
        () => {
            let data: any | null = null;

            if (!Array.isArray(value)) {
                data = getValue(value, key);
            } else {
                data = value.map(v => getValue(v, key));
            }

            prevDataRef.current = data;
            return prevDataRef.current;
        }
    );
}

function observeYType(value: any, callback: () => void, deep: boolean) {
    if (value instanceof Y.AbstractType) {
        if (deep) {
            value.observeDeep(callback);
        } else {
            value.observe(callback);
        }
    }
}

function unobserveYType(value: any, callback: () => void, deep: boolean) {
    if (value instanceof Y.AbstractType) {
        if (deep) {
            value.unobserveDeep(callback);
        } else {
            value.unobserve(callback);
        }
    }
}

function getValue(value: any, key: any) {
    if (value instanceof Y.Array) {
        log('getValue: Y.Array', { value, key });
        return value.getValue(key);
    }

    if (value instanceof Y.Map) {
        log('getValue: Y.Map', { value, key });
        return value.getValue(key);
    }
    return undefined;
}
