/**
 * lunar-javascript 类型声明
 * 该库未提供官方类型定义，这里根据项目实际使用接口做最小声明。
 */

declare module "lunar-javascript" {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar;

    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;

    getLunar(): Lunar;
  }

  export class Lunar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Lunar;

    getSolar(): Solar;
    getEightChar(): EightChar;

    getYear(): number;
    getMonth(): number;
    getDay(): number;

    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;

    toString(): string;
  }

  export class LunarMonth {
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    getLeapMonth(): number;
  }

  export class EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
  }
}
