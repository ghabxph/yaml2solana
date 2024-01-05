/**
 * Global variable class
 */
export declare abstract class Global {
    private constructor();
    /**
     * Set value to global variable
     *
     * @param name
     * @param value
     */
    static set<T>(name: string, value: T): void;
    /**
     * Get value from global variable
     *
     * @param name
     * @returns
     */
    static get<T>(name: string): T;
}
//# sourceMappingURL=global.d.ts.map