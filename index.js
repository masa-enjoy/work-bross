const ENTRY_FORM_ID_DEV = '';
const ENTRY_FORM_ID = '';
const ENTRY_FORM_SHEET1 = 'フォームの回答 1';
const RESERVE_FORM_ID_DEV = '';
const RESERVE_FORM_SHEET1 = '一覧';
const CALENDAR_ID_TACHIKAWA = '';
function doGet(e) {
  let page = 'index';
  const template = HtmlService.createTemplateFromFile(page);
  return template.evaluate();
}

function doSubmitAjax(req) {
  const params = req.parameters;
  const resObj = {};
  let templatePage = '';
  Logger.log(params);
  let isError = false;
  if(params.user_id == '' || !checkIsMember(params.user_id)) isError = true;
  if(params.user_name == '') isError = true;
  if(params.calendar_date_from == '') isError = true;
  if(params.calendar_time_from == '') isError = true;
  if(params.calendar_date_to == '') isError = true;
  if(params.calendar_time_to == '') isError = true;
  const startDate = new Date(params.calendar_date_from +' ' + params.calendar_time_from);
  const endDate = new Date(params.calendar_date_to + ' ' + params.calendar_time_to);
  const today = new Date();
  if(startDate < today) isError = true;
  if(endDate < today) isError = true;
  let reservation = getReservation(startDate,endDate);
  if(reservation.length !== 0) isError = true;
  resObj.isError = isError;
  if(!resObj.isError){
    insertRecord(params);
    registerCalendar(params);
    sendRegisterMail(params);
  }
  return resObj;
}
function insertRecord(param){
  let reservationTime = 0;
  const fromDate = new Date(param.calendar_date_from +' ' + param.calendar_time_from);
  const toDate = new Date(param.calendar_date_to + ' ' + param.calendar_time_to);
  const diffDate = toDate.getTime() - fromDate.getTime();
  const diffMinute = Math.floor(diffDate / (60000));
  reservationTime = diffMinute/60;
  const data = [[
    param.user_id, 
    param.user_name, 
    param.calendar_date_from,
    param.calendar_time_from,
    param.calendar_date_to,
    param.calendar_time_to,
    param.comment,
    reservationTime,
    new Date()
  ]];
  const app = SpreadsheetApp.openById(RESERVE_FORM_ID_DEV);
  const sheet = app.getSheetByName(RESERVE_FORM_SHEET1);
  const insertRow = sheet.getDataRange().getLastRow() + 1;  //挿入行
  const insertCol = 1;  //挿入列
  const insertRowNum = data.length;  //挿入行数
  const insertColNum = data[0].length;  //挿入列数(データ数)
  const insertRange = sheet.getRange(insertRow, insertCol,insertRowNum,insertColNum);
  insertRange.setValues(data);
}
function checkIsMember(inputUserId){
  const app = SpreadsheetApp.openById(ENTRY_FORM_ID);
  const sheet = app.getSheetByName(ENTRY_FORM_SHEET1);
  const lastRow = sheet.getLastRow();
  const USER_ID_COL = 8;
  const STATUS_COL = 16;
  let checkResult = false;
  for(var i = 2; i <= lastRow; i++) {
      const userId = sheet.getRange(i, USER_ID_COL).getValue();
      const status = sheet.getRange(i, STATUS_COL).getValue();
    if(inputUserId === userId && status === '契約中'){
      checkResult = true;
      break;
    }
  }
  return checkResult;
}
function calcReservationTimeTotal(inputUserId){
  const contractDateObj = getUserContractDate(inputUserId);
  const startDate = new Date(contractDateObj.start);
  const endDate = new Date(contractDateObj.end);
  const endDate_ = new Date(endDate);
  endDate.setDate(endDate.getDate() + 1);
  const app = SpreadsheetApp.openById(RESERVE_FORM_ID_DEV);
  const sheet = app.getSheetByName(RESERVE_FORM_SHEET1);
  const lastRow = sheet.getLastRow();
  const USER_ID_COL = 1;
  const RESERVATION_TIME_COL = 8;
  const RESERVE_END_DATE_COL = 5;
  const RESERVE_END_TIME_COL = 6;
  let total = 0;
  for(var i = 2; i <= lastRow; i++) {
      const userId = sheet.getRange(i, USER_ID_COL).getValue();
      const rowEndDateStr = sheet.getRange(i, RESERVE_END_DATE_COL).getValue();  
      const rowEndTimeStr= sheet.getRange(i, RESERVE_END_TIME_COL).getValue();
      const rowEndDate = new Date(rowEndDateStr + ' ' + rowEndTimeStr);
    if(inputUserId === userId){
      if(startDate.getTime() <= rowEndDate.getTime() && rowEndDate.getTime() < endDate.getTime()){
        const reservationTime = sheet.getRange(i, RESERVATION_TIME_COL).getValue();
        total += reservationTime;
      }
    }
  }
  const result = {};
  result.total = total;
  result.start = startDate.getFullYear() + '/' + ( startDate.getMonth() + 1) + '/' + startDate.getDate();
  result.end = endDate_.getFullYear() + '/' + ( endDate_.getMonth() + 1) + '/' + endDate_.getDate();
  return result;
}
function registerCalendar(param){
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID_TACHIKAWA);
  const title = param.user_name;
  const startTime = new Date(param.calendar_date_from +' ' + param.calendar_time_from);
  const endTime = new Date(param.calendar_date_to + ' ' + param.calendar_time_to);
  const options = {
//    description: param.comment,
//    guests: param.user_id
  };
  options.from = "info@brossmail.com";
  calendar.createEvent(title, startTime, endTime, {guests: param.user_id});
}
function sendRegisterMail(param){
  const address = param.user_id;
  const title = 'シェアキッチン予約完了通知';
  const body = param.user_name + ' 様\n'
  + '以下の内容で予約を受付けました。\n\n'
  + 'メールアドレス:' + param.user_id + '\n'
  +'氏名:' + param.user_name + '\n'
  + '日時：' + param.calendar_date_from +' ' + param.calendar_time_from + ' ～ '
  + param.calendar_date_to + ' ' + param.calendar_time_to + '\n'
  //+ '備考：' + param.comment + '\n';
  GmailApp.sendEmail(address,title,body,{from :'info@brossmail.com',name:'カスタマーサポート'});
}
//function sendErrorMail(param){
//  const address = param.user_id;
//  const title = 'シェアキッチン予約失敗通知';
//  const body = param.user_name + '様\n'
//  + '入力内容に不備があり、登録に失敗しました。\n'
//  + 'お手数ですが再度ご登録お願いします。\n'
//  + '※このメールは送信専用です。';
//  GmailApp.sendEmail(address,title,body);
//}

function getReservationTimeTotal(userId){
  const result = {};
  result.isMember = checkIsMember(userId);
  const param = calcReservationTimeTotal(userId);
  result.total = param.total;
  result.start = param.start;
  result.end = param.end;
  Logger.log(result);
 return result;
}
function getAppUrl() {
  return ScriptApp.getService().getUrl();
}
function getUserContractDate(inputUserId){
  const entryApp = SpreadsheetApp.openById(ENTRY_FORM_ID);
  const entrySheet = entryApp.getSheetByName(ENTRY_FORM_SHEET1);
  const entryLastRow = entrySheet.getLastRow();
  const ENTRY_USER_ID_COL = 8;
  const ENTRY_START_DATE_COL = 17;
    const ENTRY_END_DATE_COL = 18;
  let contractDate = {};
  for (var i = 2; i <= entryLastRow; i++) {
    const userId = entrySheet.getRange(i, ENTRY_USER_ID_COL).getValue();
    if (inputUserId === userId) {
      contractDate.start = entrySheet.getRange(i, ENTRY_START_DATE_COL).getValue();
      contractDate.end = entrySheet.getRange(i, ENTRY_END_DATE_COL).getValue();
      break;
    }
  }
  return contractDate;
}

function getReservation(start,end) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID_TACHIKAWA);
  let result = calendar.getEvents(start,end);
  return result;
}
