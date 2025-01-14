import { attachShadow, createEvent, writeTask, h, Host, proxyCustomElement } from '@stencil/core/internal/client';
import { a as chevronBack, b as chevronForward, d as chevronDown, f as caretUpSharp, g as caretDownSharp } from './index6.js';
import { b as getIonMode } from './ionic-global.js';
import { startFocusVisible } from './focus-visible.js';
import { r as raf, j as renderHiddenInput, g as getElementRoot } from './helpers.js';
import { c as createColorClasses } from './theme.js';

/**
 * Returns `true` if the document or host element
 * has a `dir` set to `rtl`. The host value will always
 * take priority over the root document value.
 */
const isRTL = (hostEl) => {
  if (hostEl) {
    if (hostEl.dir !== '') {
      return hostEl.dir.toLowerCase() === 'rtl';
    }
  }
  return (document === null || document === void 0 ? void 0 : document.dir.toLowerCase()) === 'rtl';
};

/**
 * Returns true if the selected day is equal to the reference day
 */
const isSameDay = (baseParts, compareParts) => {
  return (baseParts.month === compareParts.month &&
    baseParts.day === compareParts.day &&
    baseParts.year === compareParts.year);
};
/**
 * Returns true is the selected day is before the reference day.
 */
const isBefore = (baseParts, compareParts) => {
  return (baseParts.year < compareParts.year ||
    baseParts.year === compareParts.year && baseParts.month < compareParts.month ||
    baseParts.year === compareParts.year && baseParts.month === compareParts.month && baseParts.day < compareParts.day);
};
/**
 * Returns true is the selected day is after the reference day.
 */
const isAfter = (baseParts, compareParts) => {
  return (baseParts.year > compareParts.year ||
    baseParts.year === compareParts.year && baseParts.month > compareParts.month ||
    baseParts.year === compareParts.year && baseParts.month === compareParts.month && baseParts.day > compareParts.day);
};

/**
 * Determines if given year is a
 * leap year. Returns `true` if year
 * is a leap year. Returns `false`
 * otherwise.
 */
const isLeapYear = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};
const is24Hour = (locale, hourCycle) => {
  /**
   * If developer has explicitly enabled h23 time
   * then return early and do not look at the system default.
   */
  if (hourCycle !== undefined) {
    return hourCycle === 'h23';
  }
  /**
   * If hourCycle was not specified, check the locale
   * that is set on the user's device. We first check the
   * Intl.DateTimeFormat hourCycle option as developers can encode this
   * option into the locale string. Example: `en-US-u-hc-h23`
   */
  const formatted = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const options = formatted.resolvedOptions();
  if (options.hourCycle !== undefined) {
    return options.hourCycle === 'h23';
  }
  /**
   * If hourCycle is not specified (either through lack
   * of browser support or locale information) then fall
   * back to this slower hourCycle check.
   */
  const date = new Date('5/18/2021 00:00');
  const parts = formatted.formatToParts(date);
  const hour = parts.find(p => p.type === 'hour');
  if (!hour) {
    throw new Error('Hour value not found from DateTimeFormat');
  }
  return hour.value === '00';
};
/**
 * Given a date object, returns the number
 * of days in that month.
 * Month value begin at 1, not 0.
 * i.e. January = month 1.
 */
const getNumDaysInMonth = (month, year) => {
  return (month === 4 || month === 6 || month === 9 || month === 11) ? 30 : (month === 2) ? isLeapYear(year) ? 29 : 28 : 31;
};

const twoDigit = (val) => {
  return ('0' + (val !== undefined ? Math.abs(val) : '0')).slice(-2);
};
const fourDigit = (val) => {
  return ('000' + (val !== undefined ? Math.abs(val) : '0')).slice(-4);
};
const convertDataToISO = (data) => {
  // https://www.w3.org/TR/NOTE-datetime
  let rtn = '';
  if (data.year !== undefined) {
    // YYYY
    rtn = fourDigit(data.year);
    if (data.month !== undefined) {
      // YYYY-MM
      rtn += '-' + twoDigit(data.month);
      if (data.day !== undefined) {
        // YYYY-MM-DD
        rtn += '-' + twoDigit(data.day);
        if (data.hour !== undefined) {
          // YYYY-MM-DDTHH:mm:SS
          rtn += `T${twoDigit(data.hour)}:${twoDigit(data.minute)}:00`;
          if (data.tzOffset === undefined) {
            // YYYY-MM-DDTHH:mm:SSZ
            rtn += 'Z';
          }
          else {
            // YYYY-MM-DDTHH:mm:SS+/-HH:mm
            rtn += (data.tzOffset > 0 ? '+' : '-') + twoDigit(Math.floor(Math.abs(data.tzOffset / 60))) + ':' + twoDigit(data.tzOffset % 60);
          }
        }
      }
    }
  }
  else if (data.hour !== undefined) {
    // HH:mm
    rtn = twoDigit(data.hour) + ':' + twoDigit(data.minute);
  }
  return rtn;
};
/**
 * Converts an 12 hour value to 24 hours.
 */
const convert12HourTo24Hour = (hour, ampm) => {
  if (ampm === undefined) {
    return hour;
  }
  /**
   * If AM and 12am
   * then return 00:00.
   * Otherwise just return
   * the hour since it is
   * already in 24 hour format.
   */
  if (ampm === 'am') {
    if (hour === 12) {
      return 0;
    }
    return hour;
  }
  /**
   * If PM and 12pm
   * just return 12:00
   * since it is already
   * in 24 hour format.
   * Otherwise add 12 hours
   * to the time.
   */
  if (hour === 12) {
    return 12;
  }
  return hour + 12;
};
const getStartOfWeek = (refParts) => {
  const { dayOfWeek } = refParts;
  if (dayOfWeek === null || dayOfWeek === undefined) {
    throw new Error('No day of week provided');
  }
  return subtractDays(refParts, dayOfWeek);
};
const getEndOfWeek = (refParts) => {
  const { dayOfWeek } = refParts;
  if (dayOfWeek === null || dayOfWeek === undefined) {
    throw new Error('No day of week provided');
  }
  return addDays(refParts, 6 - dayOfWeek);
};
const getNextDay = (refParts) => {
  return addDays(refParts, 1);
};
const getPreviousDay = (refParts) => {
  return subtractDays(refParts, 1);
};
const getPreviousWeek = (refParts) => {
  return subtractDays(refParts, 7);
};
const getNextWeek = (refParts) => {
  return addDays(refParts, 7);
};
/**
 * Given datetime parts, subtract
 * numDays from the date.
 * Returns a new DatetimeParts object
 * Currently can only go backward at most 1 month.
 */
const subtractDays = (refParts, numDays) => {
  const { month, day, year } = refParts;
  if (day === null) {
    throw new Error('No day provided');
  }
  const workingParts = {
    month,
    day,
    year
  };
  workingParts.day = day - numDays;
  /**
   * If wrapping to previous month
   * update days and decrement month
   */
  if (workingParts.day < 1) {
    workingParts.month -= 1;
  }
  /**
   * If moving to previous year, reset
   * month to December and decrement year
   */
  if (workingParts.month < 1) {
    workingParts.month = 12;
    workingParts.year -= 1;
  }
  /**
   * Determine how many days are in the current
   * month
   */
  if (workingParts.day < 1) {
    const daysInMonth = getNumDaysInMonth(workingParts.month, workingParts.year);
    /**
     * Take num days in month and add the
     * number of underflow days. This number will
     * be negative.
     * Example: 1 week before Jan 2, 2021 is
     * December 26, 2021 so:
     * 2 - 7 = -5
     * 31 + (-5) = 26
     */
    workingParts.day = daysInMonth + workingParts.day;
  }
  return workingParts;
};
/**
 * Given datetime parts, add
 * numDays to the date.
 * Returns a new DatetimeParts object
 * Currently can only go forward at most 1 month.
 */
const addDays = (refParts, numDays) => {
  const { month, day, year } = refParts;
  if (day === null) {
    throw new Error('No day provided');
  }
  const workingParts = {
    month,
    day,
    year
  };
  const daysInMonth = getNumDaysInMonth(month, year);
  workingParts.day = day + numDays;
  /**
   * If wrapping to next month
   * update days and increment month
   */
  if (workingParts.day > daysInMonth) {
    workingParts.day -= daysInMonth;
    workingParts.month += 1;
  }
  /**
   * If moving to next year, reset
   * month to January and increment year
   */
  if (workingParts.month > 12) {
    workingParts.month = 1;
    workingParts.year += 1;
  }
  return workingParts;
};
/**
 * Given DatetimeParts, generate the previous month.
 */
const getPreviousMonth = (refParts) => {
  /**
   * If current month is January, wrap backwards
   *  to December of the previous year.
   */
  const month = (refParts.month === 1) ? 12 : refParts.month - 1;
  const year = (refParts.month === 1) ? refParts.year - 1 : refParts.year;
  const numDaysInMonth = getNumDaysInMonth(month, year);
  const day = (numDaysInMonth < refParts.day) ? numDaysInMonth : refParts.day;
  return { month, year, day };
};
/**
 * Given DatetimeParts, generate the next month.
 */
const getNextMonth = (refParts) => {
  /**
   * If current month is December, wrap forwards
   *  to January of the next year.
   */
  const month = (refParts.month === 12) ? 1 : refParts.month + 1;
  const year = (refParts.month === 12) ? refParts.year + 1 : refParts.year;
  const numDaysInMonth = getNumDaysInMonth(month, year);
  const day = (numDaysInMonth < refParts.day) ? numDaysInMonth : refParts.day;
  return { month, year, day };
};
const changeYear = (refParts, yearDelta) => {
  const month = refParts.month;
  const year = refParts.year + yearDelta;
  const numDaysInMonth = getNumDaysInMonth(month, year);
  const day = (numDaysInMonth < refParts.day) ? numDaysInMonth : refParts.day;
  return { month, year, day };
};
/**
 * Given DatetimeParts, generate the previous year.
 */
const getPreviousYear = (refParts) => {
  return changeYear(refParts, -1);
};
/**
 * Given DatetimeParts, generate the next year.
 */
const getNextYear = (refParts) => {
  return changeYear(refParts, 1);
};
/**
 * If PM, then internal value should
 * be converted to 24-hr time.
 * Does not apply when public
 * values are already 24-hr time.
 */
const getInternalHourValue = (hour, use24Hour, ampm) => {
  if (use24Hour) {
    return hour;
  }
  return convert12HourTo24Hour(hour, ampm);
};
/**
 * Unless otherwise stated, all month values are
 * 1 indexed instead of the typical 0 index in JS Date.
 * Example:
 *   January = Month 0 when using JS Date
 *   January = Month 1 when using this datetime util
 */
/**
 * Given the current datetime parts and a new AM/PM value
 * calculate what the hour should be in 24-hour time format.
 * Used when toggling the AM/PM segment since we store our hours
 * in 24-hour time format internally.
 */
const calculateHourFromAMPM = (currentParts, newAMPM) => {
  const { ampm: currentAMPM, hour } = currentParts;
  let newHour = hour;
  /**
   * If going from AM --> PM, need to update the
   *
   */
  if (currentAMPM === 'am' && newAMPM === 'pm') {
    newHour = convert12HourTo24Hour(newHour, 'pm');
    /**
     * If going from PM --> AM
     */
  }
  else if (currentAMPM === 'pm' && newAMPM === 'am') {
    newHour = Math.abs(newHour - 12);
  }
  return newHour;
};

/**
 * Returns the current date as
 * an ISO string in the user's
 * timezone.
 */
const getToday = () => {
  /**
   * Grab the current date object
   * as well as the timezone offset
   */
  const date = new Date();
  const tzOffset = date.getTimezoneOffset();
  /**
   * When converting to ISO string, everything is
   * set to UTC. Since we want to show these dates
   * relative to the user's timezone, we need to
   * subtract the timezone offset from the date
   * so that when `toISOString()` adds it back
   * there was a net change of zero hours from the
   * local date.
   */
  date.setHours(date.getHours() - (tzOffset / 60));
  return date.toISOString();
};
const minutes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59];
const hour12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const hour23 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
/**
 * Given a locale and a mode,
 * return an array with formatted days
 * of the week. iOS should display days
 * such as "Mon" or "Tue".
 * MD should display days such as "M"
 * or "T".
 */
const getDaysOfWeek = (locale, mode, firstDayOfWeek = 0) => {
  /**
   * Nov 1st, 2020 starts on a Sunday.
   * ion-datetime assumes weeks start on Sunday,
   * but is configurable via `firstDayOfWeek`.
   */
  const weekdayFormat = mode === 'ios' ? 'short' : 'narrow';
  const intl = new Intl.DateTimeFormat(locale, { weekday: weekdayFormat });
  const startDate = new Date('11/01/2020');
  const daysOfWeek = [];
  /**
   * For each day of the week,
   * get the day name.
   */
  for (let i = firstDayOfWeek; i < firstDayOfWeek + 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    daysOfWeek.push(intl.format(currentDate));
  }
  return daysOfWeek;
};
/**
 * Returns an array containing all of the
 * days in a month for a given year. Values are
 * aligned with a week calendar starting on
 * the firstDayOfWeek value (Sunday by default)
 * using null values.
 */
const getDaysOfMonth = (month, year, firstDayOfWeek) => {
  const numDays = getNumDaysInMonth(month, year);
  const firstOfMonth = new Date(`${month}/1/${year}`).getDay();
  /**
   * To get the first day of the month aligned on the correct
   * day of the week, we need to determine how many "filler" days
   * to generate. These filler days as empty/disabled buttons
   * that fill the space of the days of the week before the first
   * of the month.
   *
   * There are two cases here:
   *
   * 1. If firstOfMonth = 4, firstDayOfWeek = 0 then the offset
   * is (4 - (0 + 1)) = 3. Since the offset loop goes from 0 to 3 inclusive,
   * this will generate 4 filler days (0, 1, 2, 3), and then day of week 4 will have
   * the first day of the month.
   *
   * 2. If firstOfMonth = 2, firstDayOfWeek = 4 then the offset
   * is (6 - (4 - 2)) = 4. Since the offset loop goes from 0 to 4 inclusive,
   * this will generate 5 filler days (0, 1, 2, 3, 4), and then day of week 5 will have
   * the first day of the month.
   */
  const offset = firstOfMonth >= firstDayOfWeek ? firstOfMonth - (firstDayOfWeek + 1) : 6 - (firstDayOfWeek - firstOfMonth);
  let days = [];
  for (let i = 1; i <= numDays; i++) {
    days.push({ day: i, dayOfWeek: (offset + i) % 7 });
  }
  for (let i = 0; i <= offset; i++) {
    days = [
      { day: null, dayOfWeek: null },
      ...days
    ];
  }
  return days;
};
/**
 * Given a local, reference datetime parts and option
 * max/min bound datetime parts, calculate the acceptable
 * hour and minute values according to the bounds and locale.
 */
const generateTime = (refParts, hourCycle = 'h12', minParts, maxParts, hourValues, minuteValues) => {
  const use24Hour = hourCycle === 'h23';
  let processedHours = use24Hour ? hour23 : hour12;
  let processedMinutes = minutes;
  let isAMAllowed = true;
  let isPMAllowed = true;
  if (hourValues) {
    processedHours = processedHours.filter(hour => hourValues.includes(hour));
  }
  if (minuteValues) {
    processedMinutes = processedMinutes.filter(minute => minuteValues.includes(minute));
  }
  if (minParts) {
    /**
     * If ref day is the same as the
     * minimum allowed day, filter hour/minute
     * values according to min hour and minute.
     */
    if (isSameDay(refParts, minParts)) {
      /**
       * Users may not always set the hour/minute for
       * min value (i.e. 2021-06-02) so we should allow
       * all hours/minutes in that case.
       */
      if (minParts.hour !== undefined) {
        processedHours = processedHours.filter(hour => {
          const convertedHour = refParts.ampm === 'pm' ? (hour + 12) % 24 : hour;
          return (use24Hour ? hour : convertedHour) >= minParts.hour;
        });
        isAMAllowed = minParts.hour < 13;
      }
      if (minParts.minute !== undefined) {
        /**
         * The minimum minute range should not be enforced when
         * the hour is greater than the min hour.
         *
         * For example with a minimum range of 09:30, users
         * should be able to select 10:00-10:29 and beyond.
         */
        let isPastMinHour = false;
        if (minParts.hour !== undefined && refParts.hour !== undefined) {
          if (refParts.hour > minParts.hour) {
            isPastMinHour = true;
          }
        }
        processedMinutes = processedMinutes.filter(minute => {
          if (isPastMinHour) {
            return true;
          }
          return minute >= minParts.minute;
        });
      }
      /**
       * If ref day is before minimum
       * day do not render any hours/minute values
       */
    }
    else if (isBefore(refParts, minParts)) {
      processedHours = [];
      processedMinutes = [];
      isAMAllowed = isPMAllowed = false;
    }
  }
  if (maxParts) {
    /**
     * If ref day is the same as the
     * maximum allowed day, filter hour/minute
     * values according to max hour and minute.
     */
    if (isSameDay(refParts, maxParts)) {
      /**
       * Users may not always set the hour/minute for
       * max value (i.e. 2021-06-02) so we should allow
       * all hours/minutes in that case.
       */
      if (maxParts.hour !== undefined) {
        processedHours = processedHours.filter(hour => {
          const convertedHour = refParts.ampm === 'pm' ? (hour + 12) % 24 : hour;
          return convertedHour <= maxParts.hour;
        });
        isPMAllowed = maxParts.hour >= 13;
      }
      if (maxParts.minute !== undefined) {
        processedMinutes = processedMinutes.filter(minute => minute <= maxParts.minute);
      }
      /**
       * If ref day is after minimum
       * day do not render any hours/minute values
       */
    }
    else if (isAfter(refParts, maxParts)) {
      processedHours = [];
      processedMinutes = [];
      isAMAllowed = isPMAllowed = false;
    }
  }
  return {
    hours: processedHours,
    minutes: processedMinutes,
    am: isAMAllowed,
    pm: isPMAllowed
  };
};
/**
 * Given DatetimeParts, generate the previous,
 * current, and and next months.
 */
const generateMonths = (refParts) => {
  return [
    getPreviousMonth(refParts),
    { month: refParts.month, year: refParts.year, day: refParts.day },
    getNextMonth(refParts)
  ];
};
const getPickerMonths = (locale, refParts, minParts, maxParts, monthValues) => {
  const { year } = refParts;
  const months = [];
  if (monthValues !== undefined) {
    let processedMonths = monthValues;
    if ((maxParts === null || maxParts === void 0 ? void 0 : maxParts.month) !== undefined) {
      processedMonths = processedMonths.filter(month => month <= maxParts.month);
    }
    if ((minParts === null || minParts === void 0 ? void 0 : minParts.month) !== undefined) {
      processedMonths = processedMonths.filter(month => month >= minParts.month);
    }
    processedMonths.forEach(processedMonth => {
      const date = new Date(`${processedMonth}/1/${year}`);
      const monthString = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
      months.push({ text: monthString, value: processedMonth });
    });
  }
  else {
    const maxMonth = maxParts && maxParts.year === year ? maxParts.month : 12;
    const minMonth = minParts && minParts.year === year ? minParts.month : 1;
    for (let i = minMonth; i <= maxMonth; i++) {
      const date = new Date(`${i}/1/${year}`);
      const monthString = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
      months.push({ text: monthString, value: i });
    }
  }
  return months;
};
const getCalendarYears = (refParts, minParts, maxParts, yearValues) => {
  if (yearValues !== undefined) {
    let processedYears = yearValues;
    if ((maxParts === null || maxParts === void 0 ? void 0 : maxParts.year) !== undefined) {
      processedYears = processedYears.filter(year => year <= maxParts.year);
    }
    if ((minParts === null || minParts === void 0 ? void 0 : minParts.year) !== undefined) {
      processedYears = processedYears.filter(year => year >= minParts.year);
    }
    return processedYears;
  }
  else {
    const { year } = refParts;
    const maxYear = ((maxParts === null || maxParts === void 0 ? void 0 : maxParts.year) || year);
    const minYear = ((minParts === null || minParts === void 0 ? void 0 : minParts.year) || year - 100);
    const years = [];
    for (let i = maxYear; i >= minYear; i--) {
      years.push(i);
    }
    return years;
  }
};

const get12HourTime = (hour) => {
  return hour % 12 || 12;
};
const getFormattedAMPM = (ampm) => {
  if (ampm === undefined) {
    return '';
  }
  return ampm.toUpperCase();
};
const getFormattedTime = (refParts, use24Hour) => {
  if (refParts.hour === undefined || refParts.minute === undefined) {
    return 'Invalid Time';
  }
  const hour = use24Hour ? getFormattedHour(refParts.hour, use24Hour) : get12HourTime(refParts.hour);
  const minute = addTimePadding(refParts.minute);
  if (use24Hour) {
    return `${hour}:${minute}`;
  }
  return `${hour}:${minute} ${getFormattedAMPM(refParts.ampm)}`;
};
/**
 * Adds padding to a time value so
 * that it is always 2 digits.
 */
const addTimePadding = (value) => {
  const valueToString = value.toString();
  if (valueToString.length > 1) {
    return valueToString;
  }
  return `0${valueToString}`;
};
/**
 * Formats the hour value so that it
 * is always 2 digits. Only applies
 * if using 12 hour format.
 */
const getFormattedHour = (hour, use24Hour) => {
  if (!use24Hour) {
    return hour.toString();
  }
  return addTimePadding(hour);
};
/**
 * Generates an aria-label to be read by screen readers
 * given a local, a date, and whether or not that date is
 * today's date.
 */
const generateDayAriaLabel = (locale, today, refParts) => {
  if (refParts.day === null) {
    return null;
  }
  /**
   * MM/DD/YYYY will return midnight in the user's timezone.
   */
  const date = new Date(`${refParts.month}/${refParts.day}/${refParts.year}`);
  const labelString = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  /**
   * If date is today, prepend "Today" so screen readers indicate
   * that the date is today.
   */
  return (today) ? `Today, ${labelString}` : labelString;
};
/**
 * Gets the day of the week, month, and day
 * Used for the header in MD mode.
 */
const getMonthAndDay = (locale, refParts) => {
  const date = new Date(`${refParts.month}/${refParts.day}/${refParts.year}`);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
};
/**
 * Given a locale and a date object,
 * return a formatted string that includes
 * the month name and full year.
 * Example: May 2021
 */
const getMonthAndYear = (locale, refParts) => {
  const date = new Date(`${refParts.month}/${refParts.day}/${refParts.year}`);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
};

const ISO_8601_REGEXP = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/;
const TIME_REGEXP = /^((\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/;
/**
 * Use to convert a string of comma separated numbers or
 * an array of numbers, and clean up any user input
 */
const convertToArrayOfNumbers = (input) => {
  if (input === undefined) {
    return;
  }
  let processedInput = input;
  if (typeof input === 'string') {
    // convert the string to an array of strings
    // auto remove any whitespace and [] characters
    processedInput = input.replace(/\[|\]|\s/g, '').split(',');
  }
  let values;
  if (Array.isArray(processedInput)) {
    // ensure each value is an actual number in the returned array
    values = processedInput
      .map((num) => parseInt(num, 10))
      .filter(isFinite);
  }
  else {
    values = [processedInput];
  }
  return values;
};
/**
 * Extracts date information
 * from a .calendar-day element
 * into DatetimeParts.
 */
const getPartsFromCalendarDay = (el) => {
  return {
    month: parseInt(el.getAttribute('data-month'), 10),
    day: parseInt(el.getAttribute('data-day'), 10),
    year: parseInt(el.getAttribute('data-year'), 10),
    dayOfWeek: parseInt(el.getAttribute('data-day-of-week'), 10)
  };
};
/**
 * Given an ISO-8601 string, format out the parts
 * We do not use the JS Date object here because
 * it adjusts the date for the current timezone.
 */
const parseDate = (val) => {
  // manually parse IS0 cuz Date.parse cannot be trusted
  // ISO 8601 format: 1994-12-15T13:47:20Z
  let parse = null;
  if (val != null && val !== '') {
    // try parsing for just time first, HH:MM
    parse = TIME_REGEXP.exec(val);
    if (parse) {
      // adjust the array so it fits nicely with the datetime parse
      parse.unshift(undefined, undefined);
      parse[2] = parse[3] = undefined;
    }
    else {
      // try parsing for full ISO datetime
      parse = ISO_8601_REGEXP.exec(val);
    }
  }
  if (parse === null) {
    // wasn't able to parse the ISO datetime
    return undefined;
  }
  // ensure all the parse values exist with at least 0
  for (let i = 1; i < 8; i++) {
    parse[i] = parse[i] !== undefined ? parseInt(parse[i], 10) : undefined;
  }
  let tzOffset = 0;
  if (parse[9] && parse[10]) {
    // hours
    tzOffset = parseInt(parse[10], 10) * 60;
    if (parse[11]) {
      // minutes
      tzOffset += parseInt(parse[11], 10);
    }
    if (parse[9] === '-') {
      // + or -
      tzOffset *= -1;
    }
  }
  return {
    year: parse[1],
    month: parse[2],
    day: parse[3],
    hour: parse[4],
    minute: parse[5],
    second: parse[6],
    millisecond: parse[7],
    tzOffset,
  };
};

/**
 * Returns true if a given day should
 * not be interactive according to its value,
 * or the max/min dates.
 */
const isDayDisabled = (refParts, minParts, maxParts, dayValues) => {
  /**
   * If this is a filler date (i.e. padding)
   * then the date is disabled.
   */
  if (refParts.day === null) {
    return true;
  }
  /**
   * If user passed in a list of acceptable day values
   * check to make sure that the date we are looking
   * at is in this array.
   */
  if (dayValues !== undefined && !dayValues.includes(refParts.day)) {
    return true;
  }
  /**
   * Given a min date, perform the following
   * checks. If any of them are true, then the
   * day should be disabled:
   * 1. Is the current year < the min allowed year?
   * 2. Is the current year === min allowed year,
   * but the current month < the min allowed month?
   * 3. Is the current year === min allowed year, the
   * current month === min allow month, but the current
   * day < the min allowed day?
   */
  if (minParts && isBefore(refParts, minParts)) {
    return true;
  }
  /**
   * Given a max date, perform the following
   * checks. If any of them are true, then the
   * day should be disabled:
   * 1. Is the current year > the max allowed year?
   * 2. Is the current year === max allowed year,
   * but the current month > the max allowed month?
   * 3. Is the current year === max allowed year, the
   * current month === max allow month, but the current
   * day > the max allowed day?
   */
  if (maxParts && isAfter(refParts, maxParts)) {
    return true;
  }
  /**
   * If none of these checks
   * passed then the date should
   * be interactive.
   */
  return false;
};
/**
 * Given a locale, a date, the selected date, and today's date,
 * generate the state for a given calendar day button.
 */
const getCalendarDayState = (locale, refParts, activeParts, todayParts, minParts, maxParts, dayValues) => {
  const isActive = isSameDay(refParts, activeParts);
  const isToday = isSameDay(refParts, todayParts);
  const disabled = isDayDisabled(refParts, minParts, maxParts, dayValues);
  return {
    disabled,
    isActive,
    isToday,
    ariaSelected: isActive ? 'true' : null,
    ariaLabel: generateDayAriaLabel(locale, isToday, refParts)
  };
};

const datetimeIosCss = ":host{display:-ms-flexbox;display:flex;-ms-flex-flow:column;flex-flow:column;background:var(--background);overflow:hidden}:host(.datetime-size-fixed){width:auto;max-width:350px;height:auto}:host(.datetime-size-cover){width:100%}:host .calendar-body,:host .datetime-year{opacity:0}:host(:not(.datetime-ready)) .datetime-year{position:absolute;pointer-events:none}:host(.datetime-ready) .calendar-body{opacity:1}:host(.datetime-ready) .datetime-year{display:none;opacity:1}:host .datetime-calendar,:host .datetime-year{display:-ms-flexbox;display:flex;-ms-flex:1 1 auto;flex:1 1 auto;-ms-flex-flow:column;flex-flow:column}:host(.show-month-and-year) .datetime-year{display:-ms-flexbox;display:flex}:host(.show-month-and-year) .calendar-next-prev,:host(.show-month-and-year) .calendar-days-of-week,:host(.show-month-and-year) .calendar-body,:host(.show-month-and-year) .datetime-time{left:-99999px;position:absolute;visibility:hidden;pointer-events:none}:host-context([dir=rtl]):host(.show-month-and-year) .calendar-next-prev,:host-context([dir=rtl]).show-month-and-year .calendar-next-prev,:host-context([dir=rtl]):host(.show-month-and-year) .calendar-days-of-week,:host-context([dir=rtl]).show-month-and-year .calendar-days-of-week,:host-context([dir=rtl]):host(.show-month-and-year) .calendar-body,:host-context([dir=rtl]).show-month-and-year .calendar-body,:host-context([dir=rtl]):host(.show-month-and-year) .datetime-time,:host-context([dir=rtl]).show-month-and-year .datetime-time{left:unset;right:unset;right:-99999px}:host(.datetime-readonly),:host(.datetime-disabled){pointer-events:none}:host(.datetime-disabled){opacity:0.4}:host .datetime-header .datetime-title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}:host .datetime-action-buttons.has-clear-button{width:100%}:host .datetime-action-buttons ion-buttons{display:-ms-flexbox;display:flex;-ms-flex-pack:justify;justify-content:space-between}:host .calendar-action-buttons{display:-ms-flexbox;display:flex;-ms-flex-pack:justify;justify-content:space-between}:host .calendar-action-buttons ion-item,:host .calendar-action-buttons ion-button{--background:translucent}:host .calendar-action-buttons ion-item ion-label{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center}:host .calendar-action-buttons ion-item ion-icon{padding-left:4px;padding-right:0;padding-top:0;padding-bottom:0}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-action-buttons ion-item ion-icon{padding-left:unset;padding-right:unset;-webkit-padding-start:4px;padding-inline-start:4px;-webkit-padding-end:0;padding-inline-end:0}}:host .calendar-days-of-week{display:grid;grid-template-columns:repeat(7, 1fr);text-align:center}:host .calendar-body{display:-ms-flexbox;display:flex;-ms-flex-positive:1;flex-grow:1;-webkit-scroll-snap-type:x mandatory;-ms-scroll-snap-type:x mandatory;scroll-snap-type:x mandatory;overflow-x:scroll;overflow-y:hidden;scrollbar-width:none;outline:none}:host .calendar-body .calendar-month{scroll-snap-align:start;scroll-snap-stop:always;-ms-flex-negative:0;flex-shrink:0;width:100%}:host .calendar-body::-webkit-scrollbar{display:none}:host .calendar-body .calendar-month-grid{display:grid;grid-template-columns:repeat(7, 1fr);height:100%}:host .calendar-day{padding-left:0px;padding-right:0px;padding-top:0px;padding-bottom:0px;margin-left:0px;margin-right:0px;margin-top:0px;margin-bottom:0px;display:-ms-flexbox;display:flex;position:relative;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center;border:none;outline:none;background:none;color:currentColor;cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none;z-index:0}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-day{padding-left:unset;padding-right:unset;-webkit-padding-start:0px;padding-inline-start:0px;-webkit-padding-end:0px;padding-inline-end:0px}}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-day{margin-left:unset;margin-right:unset;-webkit-margin-start:0px;margin-inline-start:0px;-webkit-margin-end:0px;margin-inline-end:0px}}:host .calendar-day[disabled]{pointer-events:none;opacity:0.4}:host .calendar-day:after{border-radius:32px;padding-left:4px;padding-right:4px;padding-top:4px;padding-bottom:4px;left:50%;top:50%;position:absolute;width:32px;height:32px;-webkit-transform:translate(-50%, -50%);transform:translate(-50%, -50%);content:\" \";z-index:-1}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-day:after{padding-left:unset;padding-right:unset;-webkit-padding-start:4px;padding-inline-start:4px;-webkit-padding-end:4px;padding-inline-end:4px}}:host-context([dir=rtl]){left:unset;right:unset;right:50%}:host .datetime-time{display:-ms-flexbox;display:flex;-ms-flex-pack:justify;justify-content:space-between}:host(.datetime-presentation-time) .datetime-time{padding-left:0;padding-right:0;padding-top:0;padding-bottom:0}:host ion-popover{--height:200px}:host .time-header{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center}:host .time-body{border-radius:8px;padding-left:12px;padding-right:12px;padding-top:6px;padding-bottom:6px;display:-ms-flexbox;display:flex;border:none;background:var(--ion-color-step-300, #edeef0);color:var(--ion-text-color, #000);font-family:inherit;font-size:inherit;cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .time-body{padding-left:unset;padding-right:unset;-webkit-padding-start:12px;padding-inline-start:12px;-webkit-padding-end:12px;padding-inline-end:12px}}:host .time-body-active{color:var(--ion-color-base)}:host(.in-item){position:static}:host(.show-month-and-year) .calendar-action-buttons ion-item{--color:var(--ion-color-base)}:host{--background:var(--ion-color-light, #ffffff);--background-rgb:var(--ion-color-light-rgb);--title-color:var(--ion-color-step-600, #666666)}:host(.datetime-presentation-date-time),:host(.datetime-presentation-time-date),:host(.datetime-presentation-date){min-height:350px}:host .datetime-header{padding-left:16px;padding-right:16px;padding-top:16px;padding-bottom:16px;border-bottom:0.55px solid var(--ion-color-step-200, #cccccc)}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .datetime-header{padding-left:unset;padding-right:unset;-webkit-padding-start:16px;padding-inline-start:16px;-webkit-padding-end:16px;padding-inline-end:16px}}:host .datetime-header .datetime-title{color:var(--title-color);font-size:14px}:host .calendar-action-buttons ion-item{--padding-start:16px;--background-hover:transparent;--background-activated:transparent;font-size:16px;font-weight:600}:host .calendar-action-buttons ion-item ion-icon,:host .calendar-action-buttons ion-buttons ion-button{color:var(--ion-color-base)}:host .calendar-action-buttons ion-buttons{padding-left:0;padding-right:0;padding-top:8px;padding-bottom:0}:host .calendar-action-buttons ion-buttons ion-button{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0}:host .calendar-days-of-week{padding-left:8px;padding-right:8px;padding-top:0;padding-bottom:0;color:var(--ion-color-step-300, #b3b3b3);font-size:12px;font-weight:600;line-height:24px;text-transform:uppercase}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-days-of-week{padding-left:unset;padding-right:unset;-webkit-padding-start:8px;padding-inline-start:8px;-webkit-padding-end:8px;padding-inline-end:8px}}:host .calendar-body .calendar-month .calendar-month-grid{padding-left:8px;padding-right:8px;padding-top:8px;padding-bottom:8px;height:calc(100% - 16px)}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-body .calendar-month .calendar-month-grid{padding-left:unset;padding-right:unset;-webkit-padding-start:8px;padding-inline-start:8px;-webkit-padding-end:8px;padding-inline-end:8px}}:host .calendar-day{font-size:20px}:host .calendar-day:after{opacity:0.2}:host .calendar-day:focus:after{background:var(--ion-color-base)}:host .calendar-day.calendar-day-today{color:var(--ion-color-base)}:host .calendar-day.calendar-day-active{color:var(--ion-color-base);font-weight:600}:host .calendar-day.calendar-day-active:after{background:var(--ion-color-base)}:host .calendar-day.calendar-day-today.calendar-day-active{color:var(--ion-color-contrast)}:host .calendar-day.calendar-day-today.calendar-day-active:after{background:var(--ion-color-base);opacity:1}:host .datetime-time{padding-left:16px;padding-right:16px;padding-top:8px;padding-bottom:16px;font-size:16px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .datetime-time{padding-left:unset;padding-right:unset;-webkit-padding-start:16px;padding-inline-start:16px;-webkit-padding-end:16px;padding-inline-end:16px}}:host .datetime-time .time-header{font-weight:600}:host .datetime-buttons{padding-left:8px;padding-right:8px;padding-top:8px;padding-bottom:8px;border-top:0.55px solid var(--ion-color-step-200, #cccccc)}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .datetime-buttons{padding-left:unset;padding-right:unset;-webkit-padding-start:8px;padding-inline-start:8px;-webkit-padding-end:8px;padding-inline-end:8px}}:host .datetime-buttons ::slotted(ion-buttons),:host .datetime-buttons ion-buttons{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:justify;justify-content:space-between}:host .datetime-action-buttons{width:100%}";

const datetimeMdCss = ":host{display:-ms-flexbox;display:flex;-ms-flex-flow:column;flex-flow:column;background:var(--background);overflow:hidden}:host(.datetime-size-fixed){width:auto;max-width:350px;height:auto}:host(.datetime-size-cover){width:100%}:host .calendar-body,:host .datetime-year{opacity:0}:host(:not(.datetime-ready)) .datetime-year{position:absolute;pointer-events:none}:host(.datetime-ready) .calendar-body{opacity:1}:host(.datetime-ready) .datetime-year{display:none;opacity:1}:host .datetime-calendar,:host .datetime-year{display:-ms-flexbox;display:flex;-ms-flex:1 1 auto;flex:1 1 auto;-ms-flex-flow:column;flex-flow:column}:host(.show-month-and-year) .datetime-year{display:-ms-flexbox;display:flex}:host(.show-month-and-year) .calendar-next-prev,:host(.show-month-and-year) .calendar-days-of-week,:host(.show-month-and-year) .calendar-body,:host(.show-month-and-year) .datetime-time{left:-99999px;position:absolute;visibility:hidden;pointer-events:none}:host-context([dir=rtl]):host(.show-month-and-year) .calendar-next-prev,:host-context([dir=rtl]).show-month-and-year .calendar-next-prev,:host-context([dir=rtl]):host(.show-month-and-year) .calendar-days-of-week,:host-context([dir=rtl]).show-month-and-year .calendar-days-of-week,:host-context([dir=rtl]):host(.show-month-and-year) .calendar-body,:host-context([dir=rtl]).show-month-and-year .calendar-body,:host-context([dir=rtl]):host(.show-month-and-year) .datetime-time,:host-context([dir=rtl]).show-month-and-year .datetime-time{left:unset;right:unset;right:-99999px}:host(.datetime-readonly),:host(.datetime-disabled){pointer-events:none}:host(.datetime-disabled){opacity:0.4}:host .datetime-header .datetime-title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}:host .datetime-action-buttons.has-clear-button{width:100%}:host .datetime-action-buttons ion-buttons{display:-ms-flexbox;display:flex;-ms-flex-pack:justify;justify-content:space-between}:host .calendar-action-buttons{display:-ms-flexbox;display:flex;-ms-flex-pack:justify;justify-content:space-between}:host .calendar-action-buttons ion-item,:host .calendar-action-buttons ion-button{--background:translucent}:host .calendar-action-buttons ion-item ion-label{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center}:host .calendar-action-buttons ion-item ion-icon{padding-left:4px;padding-right:0;padding-top:0;padding-bottom:0}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-action-buttons ion-item ion-icon{padding-left:unset;padding-right:unset;-webkit-padding-start:4px;padding-inline-start:4px;-webkit-padding-end:0;padding-inline-end:0}}:host .calendar-days-of-week{display:grid;grid-template-columns:repeat(7, 1fr);text-align:center}:host .calendar-body{display:-ms-flexbox;display:flex;-ms-flex-positive:1;flex-grow:1;-webkit-scroll-snap-type:x mandatory;-ms-scroll-snap-type:x mandatory;scroll-snap-type:x mandatory;overflow-x:scroll;overflow-y:hidden;scrollbar-width:none;outline:none}:host .calendar-body .calendar-month{scroll-snap-align:start;scroll-snap-stop:always;-ms-flex-negative:0;flex-shrink:0;width:100%}:host .calendar-body::-webkit-scrollbar{display:none}:host .calendar-body .calendar-month-grid{display:grid;grid-template-columns:repeat(7, 1fr);height:100%}:host .calendar-day{padding-left:0px;padding-right:0px;padding-top:0px;padding-bottom:0px;margin-left:0px;margin-right:0px;margin-top:0px;margin-bottom:0px;display:-ms-flexbox;display:flex;position:relative;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center;border:none;outline:none;background:none;color:currentColor;cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none;z-index:0}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-day{padding-left:unset;padding-right:unset;-webkit-padding-start:0px;padding-inline-start:0px;-webkit-padding-end:0px;padding-inline-end:0px}}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-day{margin-left:unset;margin-right:unset;-webkit-margin-start:0px;margin-inline-start:0px;-webkit-margin-end:0px;margin-inline-end:0px}}:host .calendar-day[disabled]{pointer-events:none;opacity:0.4}:host .calendar-day:after{border-radius:32px;padding-left:4px;padding-right:4px;padding-top:4px;padding-bottom:4px;left:50%;top:50%;position:absolute;width:32px;height:32px;-webkit-transform:translate(-50%, -50%);transform:translate(-50%, -50%);content:\" \";z-index:-1}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-day:after{padding-left:unset;padding-right:unset;-webkit-padding-start:4px;padding-inline-start:4px;-webkit-padding-end:4px;padding-inline-end:4px}}:host-context([dir=rtl]){left:unset;right:unset;right:50%}:host .datetime-time{display:-ms-flexbox;display:flex;-ms-flex-pack:justify;justify-content:space-between}:host(.datetime-presentation-time) .datetime-time{padding-left:0;padding-right:0;padding-top:0;padding-bottom:0}:host ion-popover{--height:200px}:host .time-header{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center}:host .time-body{border-radius:8px;padding-left:12px;padding-right:12px;padding-top:6px;padding-bottom:6px;display:-ms-flexbox;display:flex;border:none;background:var(--ion-color-step-300, #edeef0);color:var(--ion-text-color, #000);font-family:inherit;font-size:inherit;cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .time-body{padding-left:unset;padding-right:unset;-webkit-padding-start:12px;padding-inline-start:12px;-webkit-padding-end:12px;padding-inline-end:12px}}:host .time-body-active{color:var(--ion-color-base)}:host(.in-item){position:static}:host(.show-month-and-year) .calendar-action-buttons ion-item{--color:var(--ion-color-base)}:host{--background:var(--ion-color-step-100, #ffffff);--title-color:var(--ion-color-contrast)}:host .datetime-header{padding-left:20px;padding-right:20px;padding-top:20px;padding-bottom:20px;background:var(--ion-color-base);color:var(--title-color)}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .datetime-header{padding-left:unset;padding-right:unset;-webkit-padding-start:20px;padding-inline-start:20px;-webkit-padding-end:20px;padding-inline-end:20px}}:host .datetime-header .datetime-title{font-size:12px;text-transform:uppercase}:host .datetime-header .datetime-selected-date{margin-top:30px;font-size:34px}:host .datetime-calendar .calendar-action-buttons ion-item{--padding-start:20px}:host .calendar-action-buttons ion-item,:host .calendar-action-buttons ion-button{color:var(--ion-color-step-650, #595959)}:host .calendar-days-of-week{padding-left:10px;padding-right:10px;padding-top:0px;padding-bottom:0px;color:var(--ion-color-step-500, gray);font-size:14px;line-height:36px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-days-of-week{padding-left:unset;padding-right:unset;-webkit-padding-start:10px;padding-inline-start:10px;-webkit-padding-end:10px;padding-inline-end:10px}}:host .calendar-body .calendar-month .calendar-month-grid{padding-left:10px;padding-right:10px;padding-top:0px;padding-bottom:0px;grid-template-rows:repeat(6, 1fr)}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-body .calendar-month .calendar-month-grid{padding-left:unset;padding-right:unset;-webkit-padding-start:10px;padding-inline-start:10px;-webkit-padding-end:10px;padding-inline-end:10px}}:host .calendar-day{padding-left:0px;padding-right:0;padding-top:13px;padding-bottom:13px;font-size:14px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .calendar-day{padding-left:unset;padding-right:unset;-webkit-padding-start:0px;padding-inline-start:0px;-webkit-padding-end:0;padding-inline-end:0}}:host .calendar-day:focus:after{background:rgba(var(--ion-color-base-rgb), 0.2);-webkit-box-shadow:0px 0px 0px 4px rgba(var(--ion-color-base-rgb), 0.2);box-shadow:0px 0px 0px 4px rgba(var(--ion-color-base-rgb), 0.2)}:host .calendar-day.calendar-day-today{color:var(--ion-color-base)}:host .calendar-day.calendar-day-today:after{border:1px solid var(--ion-color-base)}:host .calendar-day.calendar-day-active{color:var(--ion-color-contrast)}:host .calendar-day.calendar-day-active:after{border:1px solid var(--ion-color-base);background:var(--ion-color-base)}:host .datetime-time{padding-left:16px;padding-right:16px;padding-top:8px;padding-bottom:8px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .datetime-time{padding-left:unset;padding-right:unset;-webkit-padding-start:16px;padding-inline-start:16px;-webkit-padding-end:16px;padding-inline-end:16px}}:host .time-header{color:var(--ion-color-step-650, #595959)}:host(.datetime-presentation-month) .datetime-year,:host(.datetime-presentation-year) .datetime-year,:host(.datetime-presentation-month-year) .datetime-year{margin-top:20px;margin-bottom:20px}:host .datetime-buttons{padding-left:10px;padding-right:10px;padding-top:10px;padding-bottom:10px;display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:end;justify-content:flex-end}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){:host .datetime-buttons{padding-left:unset;padding-right:unset;-webkit-padding-start:10px;padding-inline-start:10px;-webkit-padding-end:10px;padding-inline-end:10px}}:host .datetime-view-buttons ion-button{color:var(--ion-color-step-800, #333333)}";

const Datetime = class extends HTMLElement {
  constructor() {
    super();
    this.__registerHost();
    attachShadow(this);
    this.ionCancel = createEvent(this, "ionCancel", 7);
    this.ionChange = createEvent(this, "ionChange", 7);
    this.ionFocus = createEvent(this, "ionFocus", 7);
    this.ionBlur = createEvent(this, "ionBlur", 7);
    this.ionStyle = createEvent(this, "ionStyle", 7);
    this.inputId = `ion-dt-${datetimeIds++}`;
    this.overlayIsPresenting = false;
    this.showMonthAndYear = false;
    this.activeParts = {
      month: 5,
      day: 28,
      year: 2021,
      hour: 13,
      minute: 52,
      ampm: 'pm'
    };
    this.workingParts = {
      month: 5,
      day: 28,
      year: 2021,
      hour: 13,
      minute: 52,
      ampm: 'pm'
    };
    this.todayParts = parseDate(getToday());
    this.isPresented = false;
    this.isTimePopoverOpen = false;
    /**
     * The color to use from your application's color palette.
     * Default options are: `"primary"`, `"secondary"`, `"tertiary"`, `"success"`, `"warning"`, `"danger"`, `"light"`, `"medium"`, and `"dark"`.
     * For more information on colors, see [theming](/docs/theming/basics).
     */
    this.color = 'primary';
    /**
     * The name of the control, which is submitted with the form data.
     */
    this.name = this.inputId;
    /**
     * If `true`, the user cannot interact with the datetime.
     */
    this.disabled = false;
    /**
     * If `true`, the datetime appears normal but is not interactive.
     */
    this.readonly = false;
    /**
     * Which values you want to select. `'date'` will show
     * a calendar picker to select the month, day, and year. `'time'`
     * will show a time picker to select the hour, minute, and (optionally)
     * AM/PM. `'date-time'` will show the date picker first and time picker second.
     * `'time-date'` will show the time picker first and date picker second.
     */
    this.presentation = 'date-time';
    /**
     * The text to display on the picker's cancel button.
     */
    this.cancelText = 'Cancel';
    /**
     * The text to display on the picker's "Done" button.
     */
    this.doneText = 'Done';
    /**
     * The text to display on the picker's "Clear" button.
     */
    this.clearText = 'Clear';
    /**
     * The locale to use for `ion-datetime`. This
     * impacts month and day name formatting.
     * The `'default'` value refers to the default
     * locale set by your device.
     */
    this.locale = 'default';
    /**
     * The first day of the week to use for `ion-datetime`. The
     * default value is `0` and represents Sunday.
     */
    this.firstDayOfWeek = 0;
    /**
     * If `true`, a header will be shown above the calendar
     * picker. On `ios` mode this will include the
     * slotted title, and on `md` mode this will include
     * the slotted title and the selected date.
     */
    this.showDefaultTitle = false;
    /**
     * If `true`, the default "Cancel" and "OK" buttons
     * will be rendered at the bottom of the `ion-datetime`
     * component. Developers can also use the `button` slot
     * if they want to customize these buttons. If custom
     * buttons are set in the `button` slot then the
     * default buttons will not be rendered.
     */
    this.showDefaultButtons = false;
    /**
     * If `true`, a "Clear" button will be rendered alongside
     * the default "Cancel" and "OK" buttons at the bottom of the `ion-datetime`
     * component. Developers can also use the `button` slot
     * if they want to customize these buttons. If custom
     * buttons are set in the `button` slot then the
     * default buttons will not be rendered.
     */
    this.showClearButton = false;
    /**
     * If `true`, the default "Time" label will be rendered
     * for the time selector of the `ion-datetime` component.
     * Developers can also use the `time-label` slot
     * if they want to customize this label. If a custom
     * label is set in the `time-label` slot then the
     * default label will not be rendered.
     */
    this.showDefaultTimeLabel = true;
    /**
     * If `cover`, the `ion-datetime` will expand to cover the full width of its container.
     * If `fixed`, the `ion-datetime` will have a fixed width.
     */
    this.size = 'fixed';
    this.closeParentOverlay = () => {
      const popoverOrModal = this.el.closest('ion-modal, ion-popover');
      if (popoverOrModal) {
        popoverOrModal.dismiss();
      }
    };
    this.setWorkingParts = (parts) => {
      this.workingParts = Object.assign({}, parts);
    };
    this.setActiveParts = (parts) => {
      this.activeParts = Object.assign({}, parts);
      const hasSlottedButtons = this.el.querySelector('[slot="buttons"]') !== null;
      if (hasSlottedButtons || this.showDefaultButtons) {
        return;
      }
      this.confirm();
    };
    this.initializeKeyboardListeners = () => {
      const { calendarBodyRef } = this;
      if (!calendarBodyRef) {
        return;
      }
      const root = this.el.shadowRoot;
      /**
       * Get a reference to the month
       * element we are currently viewing.
       */
      const currentMonth = calendarBodyRef.querySelector('.calendar-month:nth-of-type(2)');
      /**
       * When focusing the calendar body, we want to pass focus
       * to the working day, but other days should
       * only be accessible using the arrow keys. Pressing
       * Tab should jump between bodies of selectable content.
       */
      const checkCalendarBodyFocus = (ev) => {
        var _a;
        const record = ev[0];
        /**
         * If calendar body was already focused
         * when this fired or if the calendar body
         * if not currently focused, we should not re-focus
         * the inner day.
         */
        if (((_a = record.oldValue) === null || _a === void 0 ? void 0 : _a.includes('ion-focused')) ||
          !calendarBodyRef.classList.contains('ion-focused')) {
          return;
        }
        this.focusWorkingDay(currentMonth);
      };
      const mo = new MutationObserver(checkCalendarBodyFocus);
      mo.observe(calendarBodyRef, { attributeFilter: ['class'], attributeOldValue: true });
      this.destroyKeyboardMO = () => {
        mo === null || mo === void 0 ? void 0 : mo.disconnect();
      };
      /**
       * We must use keydown not keyup as we want
       * to prevent scrolling when using the arrow keys.
       */
      this.calendarBodyRef.addEventListener('keydown', (ev) => {
        const activeElement = root.activeElement;
        if (!activeElement || !activeElement.classList.contains('calendar-day')) {
          return;
        }
        const parts = getPartsFromCalendarDay(activeElement);
        let partsToFocus;
        switch (ev.key) {
          case 'ArrowDown':
            ev.preventDefault();
            partsToFocus = getNextWeek(parts);
            break;
          case 'ArrowUp':
            ev.preventDefault();
            partsToFocus = getPreviousWeek(parts);
            break;
          case 'ArrowRight':
            ev.preventDefault();
            partsToFocus = getNextDay(parts);
            break;
          case 'ArrowLeft':
            ev.preventDefault();
            partsToFocus = getPreviousDay(parts);
            break;
          case 'Home':
            ev.preventDefault();
            partsToFocus = getStartOfWeek(parts);
            break;
          case 'End':
            ev.preventDefault();
            partsToFocus = getEndOfWeek(parts);
            break;
          case 'PageUp':
            ev.preventDefault();
            partsToFocus = ev.shiftKey ? getPreviousYear(parts) : getPreviousMonth(parts);
            break;
          case 'PageDown':
            ev.preventDefault();
            partsToFocus = ev.shiftKey ? getNextYear(parts) : getNextMonth(parts);
            break;
          /**
           * Do not preventDefault here
           * as we do not want to override other
           * browser defaults such as pressing Enter/Space
           * to select a day.
           */
          default:
            return;
        }
        /**
         * If the day we want to move focus to is
         * disabled, do not do anything.
         */
        if (isDayDisabled(partsToFocus, this.minParts, this.maxParts)) {
          return;
        }
        this.setWorkingParts(Object.assign(Object.assign({}, this.workingParts), partsToFocus));
        /**
         * Give view a chance to re-render
         * then move focus to the new working day
         */
        requestAnimationFrame(() => this.focusWorkingDay(currentMonth));
      });
    };
    this.focusWorkingDay = (currentMonth) => {
      /**
       * Get the number of padding days so
       * we know how much to offset our next selector by
       * to grab the correct calenday-day element.
       */
      const padding = currentMonth.querySelectorAll('.calendar-day-padding');
      const { day } = this.workingParts;
      if (day === null) {
        return;
      }
      /**
       * Get the calendar day element
       * and focus it.
       */
      const dayEl = currentMonth.querySelector(`.calendar-day:nth-of-type(${padding.length + day})`);
      if (dayEl) {
        dayEl.focus();
      }
    };
    this.processMinParts = () => {
      if (this.min === undefined) {
        this.minParts = undefined;
        return;
      }
      const { month, day, year, hour, minute } = parseDate(this.min);
      this.minParts = {
        month,
        day,
        year,
        hour,
        minute
      };
    };
    this.processMaxParts = () => {
      if (this.max === undefined) {
        this.maxParts = undefined;
        return;
      }
      const { month, day, year, hour, minute } = parseDate(this.max);
      this.maxParts = {
        month,
        day,
        year,
        hour,
        minute
      };
    };
    this.initializeCalendarIOListeners = () => {
      const { calendarBodyRef } = this;
      if (!calendarBodyRef) {
        return;
      }
      const mode = getIonMode(this);
      /**
       * For performance reasons, we only render 3
       * months at a time: The current month, the previous
       * month, and the next month. We have IntersectionObservers
       * on the previous and next month elements to append/prepend
       * new months.
       *
       * We can do this because Stencil is smart enough to not
       * re-create the .calendar-month containers, but rather
       * update the content within those containers.
       *
       * As an added bonus, WebKit has some troubles with
       * scroll-snap-stop: always, so not rendering all of
       * the months in a row allows us to mostly sidestep
       * that issue.
       */
      const months = calendarBodyRef.querySelectorAll('.calendar-month');
      const startMonth = months[0];
      const workingMonth = months[1];
      const endMonth = months[2];
      /**
       * Before setting up the IntersectionObserver,
       * scroll the middle month into view.
       * scrollIntoView() will scroll entire page
       * if element is not in viewport. Use scrollLeft instead.
       */
      writeTask(() => {
        calendarBodyRef.scrollLeft = startMonth.clientWidth * (isRTL(this.el) ? -1 : 1);
        let endIO;
        let startIO;
        const ioCallback = (callbackType, entries) => {
          const refIO = (callbackType === 'start') ? startIO : endIO;
          const refMonth = (callbackType === 'start') ? startMonth : endMonth;
          const refMonthFn = (callbackType === 'start') ? getPreviousMonth : getNextMonth;
          /**
           * If the month is not fully in view, do not do anything
           */
          const ev = entries[0];
          if (!ev.isIntersecting) {
            return;
          }
          /**
           * When presenting an inline overlay,
           * subsequent presentations will cause
           * the IO to fire again (since the overlay
           * is now visible and therefore the calendar
           * months are intersecting).
           */
          if (this.overlayIsPresenting) {
            this.overlayIsPresenting = false;
            return;
          }
          /**
           * On iOS, we need to set pointer-events: none
           * when the user is almost done with the gesture
           * so that they cannot quickly swipe while
           * the scrollable container is snapping.
           * Updating the container while snapping
           * causes WebKit to snap incorrectly.
           */
          if (mode === 'ios') {
            const ratio = ev.intersectionRatio;
            const shouldDisable = Math.abs(ratio - 0.7) <= 0.1;
            if (shouldDisable) {
              calendarBodyRef.style.setProperty('pointer-events', 'none');
              return;
            }
          }
          /**
           * Prevent scrolling for other browsers
           * to give the DOM time to update and the container
           * time to properly snap.
           */
          calendarBodyRef.style.setProperty('overflow', 'hidden');
          /**
           * Remove the IO temporarily
           * otherwise you can sometimes get duplicate
           * events when rubber banding.
           */
          if (refIO === undefined) {
            return;
          }
          refIO.disconnect();
          /**
           * Use a writeTask here to ensure
           * that the state is updated and the
           * correct month is scrolled into view
           * in the same frame. This is not
           * typically a problem on newer devices
           * but older/slower device may have a flicker
           * if we did not do this.
           */
          writeTask(() => {
            const { month, year, day } = refMonthFn(this.workingParts);
            this.setWorkingParts(Object.assign(Object.assign({}, this.workingParts), { month, day: day, year }));
            calendarBodyRef.scrollLeft = workingMonth.clientWidth * (isRTL(this.el) ? -1 : 1);
            calendarBodyRef.style.removeProperty('overflow');
            calendarBodyRef.style.removeProperty('pointer-events');
            /**
             * Now that state has been updated
             * and the correct month is in view,
             * we can resume the IO.
             */
            // tslint:disable-next-line
            if (refIO === undefined) {
              return;
            }
            refIO.observe(refMonth);
          });
        };
        /**
         * Listen on the first month to
         * prepend a new month and on the last
         * month to append a new month.
         * The 0.7 threshold is required on ios
         * so that we can remove pointer-events
         * when adding new months.
         * Adding to a scroll snapping container
         * while the container is snapping does not
         * completely work as expected in WebKit.
         * Adding pointer-events: none allows us to
         * avoid these issues.
         *
         * This should be fine on Chromium, but
         * when you set pointer-events: none
         * it applies to active gestures which is not
         * something WebKit does.
         */
        endIO = new IntersectionObserver(ev => ioCallback('end', ev), {
          threshold: mode === 'ios' ? [0.7, 1] : 1,
          root: calendarBodyRef
        });
        endIO.observe(endMonth);
        startIO = new IntersectionObserver(ev => ioCallback('start', ev), {
          threshold: mode === 'ios' ? [0.7, 1] : 1,
          root: calendarBodyRef
        });
        startIO.observe(startMonth);
        this.destroyCalendarIO = () => {
          endIO === null || endIO === void 0 ? void 0 : endIO.disconnect();
          startIO === null || startIO === void 0 ? void 0 : startIO.disconnect();
        };
      });
    };
    /**
     * Clean up all listeners except for the overlay
     * listener. This is so that we can re-create the listeners
     * if the datetime has been hidden/presented by a modal or popover.
     */
    this.destroyListeners = () => {
      const { destroyCalendarIO, destroyKeyboardMO } = this;
      if (destroyCalendarIO !== undefined) {
        destroyCalendarIO();
      }
      if (destroyKeyboardMO !== undefined) {
        destroyKeyboardMO();
      }
    };
    /**
     * When doing subsequent presentations of an inline
     * overlay, the IO callback will fire again causing
     * the calendar to go back one month. We need to listen
     * for the presentation of the overlay so we can properly
     * cancel that IO callback.
     */
    this.initializeOverlayListener = () => {
      const overlay = this.el.closest('ion-popover, ion-modal');
      if (overlay === null) {
        return;
      }
      overlay.addEventListener('willPresent', () => {
        this.overlayIsPresenting = true;
      });
    };
    this.processValue = (value) => {
      const valueToProcess = value || getToday();
      const { month, day, year, hour, minute, tzOffset } = parseDate(valueToProcess);
      this.workingParts = {
        month,
        day,
        year,
        hour,
        minute,
        tzOffset,
        ampm: hour >= 12 ? 'pm' : 'am'
      };
      this.activeParts = {
        month,
        day,
        year,
        hour,
        minute,
        tzOffset,
        ampm: hour >= 12 ? 'pm' : 'am'
      };
    };
    this.onFocus = () => {
      this.ionFocus.emit();
    };
    this.onBlur = () => {
      this.ionBlur.emit();
    };
    this.hasValue = () => {
      return this.value != null && this.value !== '';
    };
    this.nextMonth = () => {
      const { calendarBodyRef } = this;
      if (!calendarBodyRef) {
        return;
      }
      const nextMonth = calendarBodyRef.querySelector('.calendar-month:last-of-type');
      if (!nextMonth) {
        return;
      }
      const left = nextMonth.offsetWidth * 2;
      calendarBodyRef.scrollTo({
        top: 0,
        left: left * (isRTL(this.el) ? -1 : 1),
        behavior: 'smooth'
      });
    };
    this.prevMonth = () => {
      const { calendarBodyRef } = this;
      if (!calendarBodyRef) {
        return;
      }
      const prevMonth = calendarBodyRef.querySelector('.calendar-month:first-of-type');
      if (!prevMonth) {
        return;
      }
      calendarBodyRef.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    };
    this.toggleMonthAndYearView = () => {
      this.showMonthAndYear = !this.showMonthAndYear;
    };
  }
  disabledChanged() {
    this.emitStyle();
  }
  minChanged() {
    this.processMinParts();
  }
  maxChanged() {
    this.processMaxParts();
  }
  yearValuesChanged() {
    this.parsedYearValues = convertToArrayOfNumbers(this.yearValues);
  }
  monthValuesChanged() {
    this.parsedMonthValues = convertToArrayOfNumbers(this.monthValues);
  }
  dayValuesChanged() {
    this.parsedDayValues = convertToArrayOfNumbers(this.dayValues);
  }
  hourValuesChanged() {
    this.parsedHourValues = convertToArrayOfNumbers(this.hourValues);
  }
  minuteValuesChanged() {
    this.parsedMinuteValues = convertToArrayOfNumbers(this.minuteValues);
  }
  activePartsChanged() {
    this.activePartsClone = this.activeParts;
  }
  /**
   * Update the datetime value when the value changes
   */
  valueChanged() {
    if (this.hasValue()) {
      /**
       * Clones the value of the `activeParts` to the private clone, to update
       * the date display on the current render cycle without causing another render.
       *
       * This allows us to update the current value's date/time display without
       * refocusing or shifting the user's display (leaves the user in place).
       */
      const { month, day, year, hour, minute } = parseDate(this.value);
      this.activePartsClone = Object.assign(Object.assign({}, this.activeParts), { month,
        day,
        year,
        hour,
        minute });
    }
    this.emitStyle();
    this.ionChange.emit({
      value: this.value
    });
  }
  /**
   * Confirms the selected datetime value, updates the
   * `value` property, and optionally closes the popover
   * or modal that the datetime was presented in.
   */
  async confirm(closeOverlay = false) {
    /**
     * Prevent convertDataToISO from doing any
     * kind of transformation based on timezone
     * This cancels out any change it attempts to make
     *
     * Important: Take the timezone offset based on
     * the date that is currently selected, otherwise
     * there can be 1 hr difference when dealing w/ DST
     */
    const date = new Date(convertDataToISO(this.workingParts));
    this.workingParts.tzOffset = date.getTimezoneOffset() * -1;
    this.value = convertDataToISO(this.workingParts);
    if (closeOverlay) {
      this.closeParentOverlay();
    }
  }
  /**
   * Resets the internal state of the datetime but does not update the value.
   * Passing a valid ISO-8601 string will reset the state of the component to the provided date.
   * If no value is provided, the internal state will be reset to today.
   */
  async reset(startDate) {
    this.processValue(startDate);
  }
  /**
   * Emits the ionCancel event and
   * optionally closes the popover
   * or modal that the datetime was
   * presented in.
   */
  async cancel(closeOverlay = false) {
    this.ionCancel.emit();
    if (closeOverlay) {
      this.closeParentOverlay();
    }
  }
  connectedCallback() {
    this.clearFocusVisible = startFocusVisible(this.el).destroy;
  }
  disconnectedCallback() {
    if (this.clearFocusVisible) {
      this.clearFocusVisible();
      this.clearFocusVisible = undefined;
    }
  }
  componentDidLoad() {
    /**
     * If a scrollable element is hidden using `display: none`,
     * it will not have a scroll height meaning we cannot scroll elements
     * into view. As a result, we will need to wait for the datetime to become
     * visible if used inside of a modal or a popover otherwise the scrollable
     * areas will not have the correct values snapped into place.
     */
    let visibleIO;
    const visibleCallback = (entries) => {
      const ev = entries[0];
      if (!ev.isIntersecting) {
        return;
      }
      this.initializeCalendarIOListeners();
      this.initializeKeyboardListeners();
      this.initializeOverlayListener();
      /**
       * TODO: Datetime needs a frame to ensure that it
       * can properly scroll contents into view. As a result
       * we hide the scrollable content until after that frame
       * so users do not see the content quickly shifting. The downside
       * is that the content will pop into view a frame after. Maybe there
       * is a better way to handle this?
       */
      writeTask(() => {
        this.el.classList.add('datetime-ready');
      });
    };
    visibleIO = new IntersectionObserver(visibleCallback, { threshold: 0.01 });
    /**
     * Use raf to avoid a race condition between the component loading and
     * its display animation starting (such as when shown in a modal). This
     * could cause the datetime to start at a visibility of 0, erroneously
     * triggering the `hiddenIO` observer below.
     */
    raf(() => visibleIO === null || visibleIO === void 0 ? void 0 : visibleIO.observe(this.el));
    /**
     * We need to clean up listeners when the datetime is hidden
     * in a popover/modal so that we can properly scroll containers
     * back into view if they are re-presented. When the datetime is hidden
     * the scroll areas have scroll widths/heights of 0px, so any snapping
     * we did originally has been lost.
     */
    let hiddenIO;
    const hiddenCallback = (entries) => {
      const ev = entries[0];
      if (ev.isIntersecting) {
        return;
      }
      this.destroyListeners();
      writeTask(() => {
        this.el.classList.remove('datetime-ready');
      });
    };
    hiddenIO = new IntersectionObserver(hiddenCallback, { threshold: 0 });
    raf(() => hiddenIO === null || hiddenIO === void 0 ? void 0 : hiddenIO.observe(this.el));
    /**
     * Datetime uses Ionic components that emit
     * ionFocus and ionBlur. These events are
     * composed meaning they will cross
     * the shadow dom boundary. We need to
     * stop propagation on these events otherwise
     * developers will see 2 ionFocus or 2 ionBlur
     * events at a time.
     */
    const root = getElementRoot(this.el);
    root.addEventListener('ionFocus', (ev) => ev.stopPropagation());
    root.addEventListener('ionBlur', (ev) => ev.stopPropagation());
  }
  componentWillLoad() {
    this.processValue(this.value);
    this.processMinParts();
    this.processMaxParts();
    this.parsedHourValues = convertToArrayOfNumbers(this.hourValues);
    this.parsedMinuteValues = convertToArrayOfNumbers(this.minuteValues);
    this.parsedMonthValues = convertToArrayOfNumbers(this.monthValues);
    this.parsedYearValues = convertToArrayOfNumbers(this.yearValues);
    this.parsedDayValues = convertToArrayOfNumbers(this.dayValues);
    this.emitStyle();
  }
  emitStyle() {
    this.ionStyle.emit({
      'interactive': true,
      'datetime': true,
      'interactive-disabled': this.disabled,
    });
  }
  renderFooter() {
    const { showDefaultButtons, showClearButton } = this;
    const hasSlottedButtons = this.el.querySelector('[slot="buttons"]') !== null;
    if (!hasSlottedButtons && !showDefaultButtons && !showClearButton) {
      return;
    }
    const clearButtonClick = () => {
      this.reset();
      this.value = undefined;
    };
    /**
     * By default we render two buttons:
     * Cancel - Dismisses the datetime and
     * does not update the `value` prop.
     * OK - Dismisses the datetime and
     * updates the `value` prop.
     */
    return (h("div", { class: "datetime-footer" }, h("div", { class: "datetime-buttons" }, h("div", { class: {
        ['datetime-action-buttons']: true,
        ['has-clear-button']: this.showClearButton
      } }, h("slot", { name: "buttons" }, h("ion-buttons", null, showDefaultButtons && h("ion-button", { id: "cancel-button", color: this.color, onClick: () => this.cancel(true) }, this.cancelText), h("div", null, showClearButton && h("ion-button", { id: "clear-button", color: this.color, onClick: () => clearButtonClick() }, this.clearText), showDefaultButtons && h("ion-button", { id: "confirm-button", color: this.color, onClick: () => this.confirm(true) }, this.doneText))))))));
  }
  renderYearView() {
    const { presentation, workingParts } = this;
    const calendarYears = getCalendarYears(this.todayParts, this.minParts, this.maxParts, this.parsedYearValues);
    const showMonth = presentation !== 'year';
    const showYear = presentation !== 'month';
    const months = getPickerMonths(this.locale, workingParts, this.minParts, this.maxParts, this.parsedMonthValues);
    const years = calendarYears.map(year => {
      return {
        text: `${year}`,
        value: year
      };
    });
    return (h("div", { class: "datetime-year" }, h("div", { class: "datetime-year-body" }, h("ion-picker-internal", null, showMonth &&
      h("ion-picker-column-internal", { color: this.color, items: months, value: workingParts.month, onIonChange: (ev) => {
          this.setWorkingParts(Object.assign(Object.assign({}, this.workingParts), { month: ev.detail.value }));
          if (presentation === 'month' || presentation === 'month-year') {
            this.setActiveParts(Object.assign(Object.assign({}, this.activeParts), { month: ev.detail.value }));
          }
          ev.stopPropagation();
        } }), showYear &&
      h("ion-picker-column-internal", { color: this.color, items: years, value: workingParts.year, onIonChange: (ev) => {
          this.setWorkingParts(Object.assign(Object.assign({}, this.workingParts), { year: ev.detail.value }));
          if (presentation === 'year' || presentation === 'month-year') {
            this.setActiveParts(Object.assign(Object.assign({}, this.activeParts), { year: ev.detail.value }));
          }
          ev.stopPropagation();
        } })))));
  }
  renderCalendarHeader(mode) {
    const expandedIcon = mode === 'ios' ? chevronDown : caretUpSharp;
    const collapsedIcon = mode === 'ios' ? chevronForward : caretDownSharp;
    return (h("div", { class: "calendar-header" }, h("div", { class: "calendar-action-buttons" }, h("div", { class: "calendar-month-year" }, h("ion-item", { button: true, detail: false, lines: "none", onClick: () => this.toggleMonthAndYearView() }, h("ion-label", null, getMonthAndYear(this.locale, this.workingParts), " ", h("ion-icon", { icon: this.showMonthAndYear ? expandedIcon : collapsedIcon, lazy: false })))), h("div", { class: "calendar-next-prev" }, h("ion-buttons", null, h("ion-button", { onClick: () => this.prevMonth() }, h("ion-icon", { slot: "icon-only", icon: chevronBack, lazy: false, flipRtl: true })), h("ion-button", { onClick: () => this.nextMonth() }, h("ion-icon", { slot: "icon-only", icon: chevronForward, lazy: false, flipRtl: true }))))), h("div", { class: "calendar-days-of-week" }, getDaysOfWeek(this.locale, mode, this.firstDayOfWeek % 7).map(d => {
      return h("div", { class: "day-of-week" }, d);
    }))));
  }
  renderMonth(month, year) {
    const yearAllowed = this.parsedYearValues === undefined || this.parsedYearValues.includes(year);
    const monthAllowed = this.parsedMonthValues === undefined || this.parsedMonthValues.includes(month);
    const isMonthDisabled = !yearAllowed || !monthAllowed;
    return (h("div", { class: "calendar-month" }, h("div", { class: "calendar-month-grid" }, getDaysOfMonth(month, year, this.firstDayOfWeek % 7).map((dateObject, index) => {
      const { day, dayOfWeek } = dateObject;
      const referenceParts = { month, day, year };
      const { isActive, isToday, ariaLabel, ariaSelected, disabled } = getCalendarDayState(this.locale, referenceParts, this.activePartsClone, this.todayParts, this.minParts, this.maxParts, this.parsedDayValues);
      return (h("button", { tabindex: "-1", "data-day": day, "data-month": month, "data-year": year, "data-index": index, "data-day-of-week": dayOfWeek, disabled: isMonthDisabled || disabled, class: {
          'calendar-day-padding': day === null,
          'calendar-day': true,
          'calendar-day-active': isActive,
          'calendar-day-today': isToday
        }, "aria-selected": ariaSelected, "aria-label": ariaLabel, onClick: () => {
          if (day === null) {
            return;
          }
          this.setWorkingParts(Object.assign(Object.assign({}, this.workingParts), { month,
            day,
            year }));
          this.setActiveParts(Object.assign(Object.assign({}, this.activeParts), { month,
            day,
            year }));
        } }, day));
    }))));
  }
  renderCalendarBody() {
    return (h("div", { class: "calendar-body ion-focusable", ref: el => this.calendarBodyRef = el, tabindex: "0" }, generateMonths(this.workingParts).map(({ month, year }) => {
      return this.renderMonth(month, year);
    })));
  }
  renderCalendar(mode) {
    return (h("div", { class: "datetime-calendar" }, this.renderCalendarHeader(mode), this.renderCalendarBody()));
  }
  renderTimeLabel() {
    const hasSlottedTimeLabel = this.el.querySelector('[slot="time-label"]') !== null;
    if (!hasSlottedTimeLabel && !this.showDefaultTimeLabel) {
      return;
    }
    return (h("slot", { name: "time-label" }, "Time"));
  }
  renderTimePicker(hoursItems, minutesItems, ampmItems, use24Hour) {
    const { color, activePartsClone, workingParts } = this;
    return (h("ion-picker-internal", null, h("ion-picker-column-internal", { color: color, value: activePartsClone.hour, items: hoursItems, numericInput: true, onIonChange: (ev) => {
        this.setWorkingParts(Object.assign(Object.assign({}, workingParts), { hour: ev.detail.value }));
        this.setActiveParts(Object.assign(Object.assign({}, activePartsClone), { hour: ev.detail.value }));
        ev.stopPropagation();
      } }), h("ion-picker-column-internal", { color: color, value: activePartsClone.minute, items: minutesItems, numericInput: true, onIonChange: (ev) => {
        this.setWorkingParts(Object.assign(Object.assign({}, workingParts), { minute: ev.detail.value }));
        this.setActiveParts(Object.assign(Object.assign({}, activePartsClone), { minute: ev.detail.value }));
        ev.stopPropagation();
      } }), !use24Hour && h("ion-picker-column-internal", { color: color, value: activePartsClone.ampm, items: ampmItems, onIonChange: (ev) => {
        const hour = calculateHourFromAMPM(workingParts, ev.detail.value);
        this.setWorkingParts(Object.assign(Object.assign({}, workingParts), { ampm: ev.detail.value, hour }));
        this.setActiveParts(Object.assign(Object.assign({}, activePartsClone), { ampm: ev.detail.value, hour }));
        ev.stopPropagation();
      } })));
  }
  renderTimeOverlay(hoursItems, minutesItems, ampmItems, use24Hour) {
    return [
      h("div", { class: "time-header" }, this.renderTimeLabel()),
      h("button", { class: {
          'time-body': true,
          'time-body-active': this.isTimePopoverOpen
        }, "aria-expanded": "false", "aria-haspopup": "true", onClick: async (ev) => {
          const { popoverRef } = this;
          if (popoverRef) {
            this.isTimePopoverOpen = true;
            popoverRef.present(ev);
            await popoverRef.onWillDismiss();
            this.isTimePopoverOpen = false;
          }
        } }, getFormattedTime(this.activePartsClone, use24Hour)),
      h("ion-popover", { alignment: "center", translucent: true, overlayIndex: 1, arrow: false, style: {
          '--offset-y': '-10px'
        },
        // Allow native browser keyboard events to support up/down/home/end key
        // navigation within the time picker.
        keyboardEvents: true, ref: el => this.popoverRef = el }, this.renderTimePicker(hoursItems, minutesItems, ampmItems, use24Hour))
    ];
  }
  /**
   * Render time picker inside of datetime.
   * Do not pass color prop to segment on
   * iOS mode. MD segment has been customized and
   * should take on the color prop, but iOS
   * should just be the default segment.
   */
  renderTime() {
    const { workingParts, presentation } = this;
    const timeOnlyPresentation = presentation === 'time';
    const use24Hour = is24Hour(this.locale, this.hourCycle);
    const { hours, minutes, am, pm } = generateTime(this.workingParts, use24Hour ? 'h23' : 'h12', this.minParts, this.maxParts, this.parsedHourValues, this.parsedMinuteValues);
    const hoursItems = hours.map(hour => {
      return {
        text: getFormattedHour(hour, use24Hour),
        value: getInternalHourValue(hour, use24Hour, workingParts.ampm)
      };
    });
    const minutesItems = minutes.map(minute => {
      return {
        text: addTimePadding(minute),
        value: minute
      };
    });
    const ampmItems = [];
    if (am) {
      ampmItems.push({
        text: 'AM',
        value: 'am'
      });
    }
    if (pm) {
      ampmItems.push({
        text: 'PM',
        value: 'pm'
      });
    }
    return (h("div", { class: "datetime-time" }, timeOnlyPresentation ? this.renderTimePicker(hoursItems, minutesItems, ampmItems, use24Hour) : this.renderTimeOverlay(hoursItems, minutesItems, ampmItems, use24Hour)));
  }
  renderCalendarViewHeader(mode) {
    const hasSlottedTitle = this.el.querySelector('[slot="title"]') !== null;
    if (!hasSlottedTitle && !this.showDefaultTitle) {
      return;
    }
    return (h("div", { class: "datetime-header" }, h("div", { class: "datetime-title" }, h("slot", { name: "title" }, "Select Date")), mode === 'md' && h("div", { class: "datetime-selected-date" }, getMonthAndDay(this.locale, this.activeParts))));
  }
  renderDatetime(mode) {
    const { presentation } = this;
    switch (presentation) {
      case 'date-time':
        return [
          this.renderCalendarViewHeader(mode),
          this.renderCalendar(mode),
          this.renderYearView(),
          this.renderTime(),
          this.renderFooter()
        ];
      case 'time-date':
        return [
          this.renderCalendarViewHeader(mode),
          this.renderTime(),
          this.renderCalendar(mode),
          this.renderYearView(),
          this.renderFooter()
        ];
      case 'time':
        return [
          this.renderTime(),
          this.renderFooter()
        ];
      case 'month':
      case 'month-year':
      case 'year':
        return [
          this.renderYearView(),
          this.renderFooter()
        ];
      default:
        return [
          this.renderCalendarViewHeader(mode),
          this.renderCalendar(mode),
          this.renderYearView(),
          this.renderFooter()
        ];
    }
  }
  render() {
    const { name, value, disabled, el, color, isPresented, readonly, showMonthAndYear, presentation, size } = this;
    const mode = getIonMode(this);
    const isMonthAndYearPresentation = presentation === 'year' || presentation === 'month' || presentation === 'month-year';
    const shouldShowMonthAndYear = showMonthAndYear || isMonthAndYearPresentation;
    renderHiddenInput(true, el, name, value, disabled);
    return (h(Host, { "aria-disabled": disabled ? 'true' : null, onFocus: this.onFocus, onBlur: this.onBlur, class: Object.assign({}, createColorClasses(color, {
        [mode]: true,
        ['datetime-presented']: isPresented,
        ['datetime-readonly']: readonly,
        ['datetime-disabled']: disabled,
        'show-month-and-year': shouldShowMonthAndYear,
        [`datetime-presentation-${presentation}`]: true,
        [`datetime-size-${size}`]: true
      })) }, this.renderDatetime(mode)));
  }
  get el() { return this; }
  static get watchers() { return {
    "disabled": ["disabledChanged"],
    "min": ["minChanged"],
    "max": ["maxChanged"],
    "yearValues": ["yearValuesChanged"],
    "monthValues": ["monthValuesChanged"],
    "dayValues": ["dayValuesChanged"],
    "hourValues": ["hourValuesChanged"],
    "minuteValues": ["minuteValuesChanged"],
    "activeParts": ["activePartsChanged"],
    "value": ["valueChanged"]
  }; }
  static get style() { return {
    ios: datetimeIosCss,
    md: datetimeMdCss
  }; }
};
let datetimeIds = 0;

const IonDatetime = /*@__PURE__*/proxyCustomElement(Datetime, [33,"ion-datetime",{"color":[1],"name":[1],"disabled":[4],"readonly":[4],"min":[1025],"max":[1025],"presentation":[1],"cancelText":[1,"cancel-text"],"doneText":[1,"done-text"],"clearText":[1,"clear-text"],"yearValues":[8,"year-values"],"monthValues":[8,"month-values"],"dayValues":[8,"day-values"],"hourValues":[8,"hour-values"],"minuteValues":[8,"minute-values"],"locale":[1],"firstDayOfWeek":[2,"first-day-of-week"],"value":[1025],"showDefaultTitle":[4,"show-default-title"],"showDefaultButtons":[4,"show-default-buttons"],"showClearButton":[4,"show-clear-button"],"showDefaultTimeLabel":[4,"show-default-time-label"],"hourCycle":[1,"hour-cycle"],"size":[1],"showMonthAndYear":[32],"activeParts":[32],"workingParts":[32],"isPresented":[32],"isTimePopoverOpen":[32]}]);

export { IonDatetime };
