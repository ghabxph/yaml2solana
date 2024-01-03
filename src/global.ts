
/**
 * Global variable record
 */
const GLOBAL_VARIABLES: Record<string, any> = {};

/**
 * Global variable class
 */
export abstract class Global {

  private constructor(){}

  /**
   * Set value to global variable
   *
   * @param name
   * @param value
   */
  static set<T>(name: string, value: T) {
    GLOBAL_VARIABLES[name] = value;
  }

  /**
   * Get value from global variable
   *
   * @param name
   * @returns
   */
  static get<T>(name: string): T {
    return GLOBAL_VARIABLES[name];
  }
}
