export namespace Constants {
    export const TAG_CONTAINER_ID = 'tag-container';
    export const SHOPPING_PRODUCT_CATEGORY_ID = 'product-categories';
    export const INGREDIENTS_CONTAINER_ID = 'ingredients';
    export const LIST_CONTAINER_ID = 'list';

    // Zone used when handing wall-clock event times to Google Calendar. Events store a
    // UTC-midnight day plus an 'HH:mm' string, so the offset is resolved by Google.
    export const TIME_ZONE = 'Europe/Warsaw';
    export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
    export const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars';
}