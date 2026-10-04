/** Add this file beside Code.gs and run applySadiraTheme() from the editor. */
function applySadiraTheme() {
  var ss = getSpreadsheet_();
  var styled = [];
  Object.keys(SHEET_HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastColumn() < 1) return;
    var columns = sheet.getLastColumn();
    var rows = Math.min(sheet.getMaxRows(), Math.max(sheet.getLastRow() + 50, 100));
    var range = sheet.getRange(1, 1, rows, columns);
    // Replace alternating-color formatting only. Values and formulas remain intact.
    sheet.getBandings().forEach(function (banding) { banding.remove(); });
    range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
      .setHeaderRowColor('#F0B8C9')
      .setFirstRowColor('#FFFFFF')
      .setSecondRowColor('#FFF3F6');
    range.setFontFamily('Arial').setFontSize(10).setFontColor('#000000')
      .setFontWeight('bold').setVerticalAlignment('middle');
    sheet.setTabColor('#A34663');
    sheet.setHiddenGridlines(true);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(1);
    sheet.setRowHeights(1, rows, 30);
    sheet.setRowHeight(1, 44);
    sheet.setColumnWidths(1, columns, 170);
    sheet.getRange(1, 1, 1, columns).setWrap(true)
      .setBorder(false, false, true, false, false, false, '#A34663', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    var headers = sheet.getRange(1, 1, 1, columns).getValues()[0];
    headers.forEach(function (header, index) {
      var column = index + 1;
      var body = sheet.getRange(2, column, rows - 1, 1);
      if (['subtotal', 'delivery_charge', 'discount', 'total', 'unit_price', 'line_total'].indexOf(header) !== -1) {
        body.setNumberFormat('"৳ "#,##0').setHorizontalAlignment('right');
      }
      if (['stock', 'quantity', 'stock_before', 'stock_after', 'total_orders'].indexOf(header) !== -1) {
        body.setNumberFormat('#,##0').setHorizontalAlignment('right');
      }
      if (/name|address|note/.test(String(header))) {
        sheet.setColumnWidth(column, 260);
        body.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
      }
      if (header === 'product_json') {
        sheet.setColumnWidth(column, 340);
        body.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      }
    });
    styled.push(name);
  });
  SpreadsheetApp.flush();
  ss.toast('Theme applied to ' + styled.length + ' tabs.', 'Sadira', 5);
  console.log('Sadira theme applied: ' + styled.join(', '));
}
