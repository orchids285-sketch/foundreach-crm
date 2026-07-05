import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  TEMPLATE_FIELDS_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  TEMPLATE_FIELDS_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIER,
  TEMPLATE_NOTE_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  TEMPLATE_NOTE_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIER,
  TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

// A "Fields" tab for the record's own fields (name, body, target), plus a
// dedicated "Note" tab that renders the RICH_TEXT `body` in Twenty's native
// rich-text editor — the same FIELD_RICH_TEXT widget the standard Note object
// uses (it binds to the object's rich-text field automatically). An app-defined
// record page replaces the object's default layout, so it must carry its own
// fields tab or the record shows "No Data".
export default definePageLayout({
  universalIdentifier: TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Template record page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: TEMPLATE_FIELDS_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Fields',
      position: 0,
      icon: 'IconList',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier:
            TEMPLATE_FIELDS_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Template fields',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
          },
        },
      ],
    },
    {
      universalIdentifier: TEMPLATE_NOTE_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Note',
      position: 50,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier:
            TEMPLATE_NOTE_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Note',
          type: 'FIELD_RICH_TEXT',
          configuration: {
            configurationType: 'FIELD_RICH_TEXT',
          },
        },
      ],
    },
  ],
});
