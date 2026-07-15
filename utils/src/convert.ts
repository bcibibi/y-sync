import debug from 'debug';
import * as Y from 'yjs';

const log = debug('y-utils:convert');

export namespace YConverter {

    function convertString(value: string, root?: Y.Text): Y.Text {
        log('Converting string value:', value);
        const text = root || new Y.Text();
        text.setText(value);
        return text;
    }

    function convertDate(value: Date, root?: Y.Text): Y.Text {
        const text = root || new Y.Text();
        text.setDate(value);
        return text;
    }

    function convertNumber(value: number, root?: Y.Text): Y.Text {
        const text = root || new Y.Text();
        text.setNumber(value);
        return text;
    }

    function convertBoolean(value: boolean, root?: Y.Text): Y.Text {
        const text = root || new Y.Text();
        text.setBoolean(value);
        return text;
    }

    function isDelta(obj: any) {
        return (
            obj !== null &&
            typeof obj === 'object' &&
            Array.isArray(obj.ops)
        );
    }

    function convertDelta(value: any, root?: Y.Text): Y.Text {
        const text = root || new Y.Text();
        text.applyDelta(value.ops);
        text.setAttribute('__type', 'delta');
        return text;
    }

    function convertArray<D>(value: D[], root?: Y.Array<Y.MapValue<D>>): Y.Array<Y.MapValue<D>> {
        const yArray = root || new Y.Array<Y.MapValue<D>>();
        value.forEach(item => {
            yArray.push([toYjs(item)]);
        });
        return yArray;
    }


    function convertObject<D extends Record<string, any>>(value: D, root?: Y.Map<Y.MapObject<D>>): Y.Map<Y.MapObject<D>> {
        const yMap = root || new Y.Map<Y.MapObject<D>>();
        for (const key in value) {
            yMap.set(key, toYjs(value[key]));
        }
        return yMap;
    }

    export function toYjs<D>(value: D, root?: Y.MapValue<D>): Y.MapValue<D> {
        log('Converting value to Yjs type:', value);
        log('Root type:', root ? root.constructor.name : 'undefined');
        if (value instanceof Y.AbstractType) {
            log('Returning Y.AbstractType value');
            return value as Y.MapValue<D>;
        }

        if (typeof value === 'string') {
            log('Returning text value');
            return convertString(value, root as Y.Text) as Y.MapValue<D>;
        }

        if (typeof value === 'number') {
            log('Returning number value');
            return convertNumber(value, root as Y.Text) as Y.MapValue<D>;
        }

        if (typeof value === 'boolean') {
            log('Returning boolean value');
            return convertBoolean(value, root as Y.Text) as Y.MapValue<D>;
        }

        if (value instanceof Date) {
            log('Returning date value');
            return convertDate(value, root as Y.Text) as Y.MapValue<D>;
        }

        if (isDelta(value)) {
            log('Returning delta value');
            return convertDelta(value, root as Y.Text) as Y.MapValue<D>;
        }

        if (Array.isArray(value)) {
            log('Converting array to Y.Array');
            return convertArray(value, root as Y.Array<any>) as Y.MapValue<D>;
        }

        if (typeof value === 'object' && value !== null) {
            log('Converting object to Y.Map');
            return convertObject(value, root as Y.Map<Y.MapObject<D & object>>) as Y.MapValue<D>;
        }

        return new Y.Text(String(value)) as Y.MapValue<D>;
    }

}
