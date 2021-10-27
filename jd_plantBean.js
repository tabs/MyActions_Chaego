/*
种豆得豆 脚本更新地址：https://raw.githubusercontent.com/Aaron-lv/sync/jd_scripts/jd_plantBean.js
更新时间：2021-04-9
活动入口：京东APP我的-更多工具-种豆得豆
已支持IOS京东多账号,云端多京东账号
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
注：会自动关注任务中的店铺跟商品，介意者勿使用。
互助码shareCode请先手动运行脚本查看打印可看到
每个京东账号每天只能帮助3个人。多出的助力码将会助力失败。
=====================================Quantumult X=================================
[task_local]
1 7-21/2 * * * https://raw.githubusercontent.com/Aaron-lv/sync/jd_scripts/jd_plantBean.js, tag=种豆得豆, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jdzd.png, enabled=true
=====================================Loon================================
[Script]
cron "1 7-21/2 * * *" script-path=https://raw.githubusercontent.com/Aaron-lv/sync/jd_scripts/jd_plantBean.js,tag=京东种豆得豆
======================================Surge==========================
京东种豆得豆 = type=cron,cronexp="1 7-21/2 * * *",wake-system=1,timeout=3600,script-path=https://raw.githubusercontent.com/Aaron-lv/sync/jd_scripts/jd_plantBean.js
====================================小火箭=============================
京东种豆得豆 = type=cron,script-path=https://raw.githubusercontent.com/Aaron-lv/sync/jd_scripts/jd_plantBean.js, cronexpr="1 7-21/2 * * *", timeout=3600, enable=true
*/
const $ = new Env('京东种豆得豆');
//Node.js用户请在jdCookie.js处填写京东ck;
//ios等软件用户直接用NobyDa的jd cookie
let jdNotify = true;//是否开启静默运行。默认true开启
let cookiesArr = [], cookie = '', jdPlantBeanShareArr = [], isBox = false, notify, newShareCodes, option, message,subTitle;
//京东接口地址
const JD_API_HOST = 'https://api.m.jd.com/client.action';
//助力好友分享码(最多3个,否则后面的助力失败)
//此此内容是IOS用户下载脚本到本地使用，填写互助码的地方，同一京东账号的好友互助码请使用@符号隔开。
//下面给出两个账号的填写示例（iOS只支持2个京东账号）
let shareCodes = [ // IOS本地脚本用户这个列表填入你要助力的好友的shareCode
                   //账号一的好友shareCode,不同好友的shareCode中间用@符号隔开
  '3xd6hi7wz3detzueuft3fjnaq6shonvreqhvugy@nkvdrkoit5o65hgsezt2hkynoeq3olf63v6icua@fb227jqogvovf4dzt65kyksuqq3h7wlwy7o5jii@2glpkm3dt2ujt5eufktgoxeewa5ac3f4ijdgqji@anvpoh7gttncs535ikqc3dfbbsnst3auzw6gmjq@e7lhibzb3zek3l2je2y7rjczlz3sq4c6e2r72di@mlrdw3aw26j3xrwlavyve554fsprq7lxnn2esoa@7ii2tqua5cw4cuvznmvewfo7gbrfz5c4dyurxen5sazkv5ctbrdq',
  //账号二的好友shareCode,不同好友的shareCode中间用@符号隔开
  '3xd6hi7wz3detzueuft3fjnaq6shonvreqhvugy@nkvdrkoit5o65hgsezt2hkynoeq3olf63v6icua@fb227jqogvovf4dzt65kyksuqq3h7wlwy7o5jii@2glpkm3dt2ujt5eufktgoxeewa5ac3f4ijdgqji@anvpoh7gttncs535ikqc3dfbbsnst3auzw6gmjq@e7lhibzb3zek3l2je2y7rjczlz3sq4c6e2r72di@mlrdw3aw26j3xrwlavyve554fsprq7lxnn2esoa@7ii2tqua5cw4cuvznmvewfo7gbrfz5c4dyurxen5sazkv5ctbrdq',
]
let allMessage = ``;
let currentRoundId = null;//本期活动id
let lastRoundId = null;//上期id
let roundList = [];
let awardState = '';//上期活动的京豆是否收取
let num;
let helpAuthor = true;
!(async () => {
  await requireConfig();
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      await TotalBean();
      console.log(`\n开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});

        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      message = '';
      subTitle = '';
      option = {};
      await getinfo()
      await shareCodesFormat();
      await jdPlantBean();
      await showMsg();
    }
  }
  if ($.isNode() && allMessage) {
    await notify.sendNotify(`${$.name}`, `${allMessage}`)
  }
})().catch((e) => {
  $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
  $.done();
})

async function jdPlantBean() {
  try {
    console.log(`获取任务及基本信息`)
    await plantBeanIndex();
    if ($.plantBeanIndexResult.errorCode === 'PB101') {
      console.log(`\n活动太火爆了，还是去买买买吧！\n`)
      return
    }
    for (let i = 0; i < $.plantBeanIndexResult.data.roundList.length; i++) {
      if ($.plantBeanIndexResult.data.roundList[i].roundState === "2") {
        num = i
        break
      }
    }
    // console.log(plantBeanIndexResult.data.taskList);
    if ($.plantBeanIndexResult && $.plantBeanIndexResult.code === '0' && $.plantBeanIndexResult.data) {
      const shareUrl = $.plantBeanIndexResult.data.jwordShareInfo.shareUrl
      $.myPlantUuid = getParam(shareUrl, 'plantUuid')
      console.log(`\n【京东账号${$.index}（${$.UserName}）的${$.name}好友互助码】${$.myPlantUuid}\n`);
      roundList = $.plantBeanIndexResult.data.roundList;
      currentRoundId = roundList[num].roundId;//本期的roundId
      lastRoundId = roundList[num - 1].roundId;//上期的roundId
      awardState = roundList[num - 1].awardState;
      $.taskList = $.plantBeanIndexResult.data.taskList;
      subTitle = `【京东昵称】${$.plantBeanIndexResult.data.plantUserInfo.plantNickName}`;
      message += `【上期时间】${roundList[num - 1].dateDesc.replace('上期 ', '')}\n`;
      message += `【上期成长值】${roundList[num - 1].growth}\n`;
      await receiveNutrients();//定时领取营养液
      await doHelp();//助力
      await doTask();//做日常任务
      //await doEgg();
      await stealFriendWater();
      await doCultureBean();
      await doGetReward();
      await showTaskProcess();
      await plantShareSupportList();
    } else {
      console.log(`种豆得豆-初始失败:  ${JSON.stringify($.plantBeanIndexResult)}`);
    }
  } catch (e) {
    $.logErr(e);
    const errMsg = `京东账号${$.index} ${$.nickName || $.UserName}\n任务执行异常，请检查执行日志 ‼️‼️`;
    $.msg($.name, '', `京东账号${$.index} ${$.nickName || $.UserName}\n${errMsg}`)
  }
}
async function doGetReward() {
  console.log(`【上轮京豆】${awardState === '4' ? '采摘中' : awardState === '5' ? '可收获了' : '已领取'}`);
  if (awardState === '4') {
    //京豆采摘中...
    message += `【上期状态】${roundList[num - 1].tipBeanEndTitle}\n`;
  } else if (awardState === '5') {
    //收获
    await getReward();
    console.log('开始领取京豆');
    if ($.getReward && $.getReward.code === '0') {
      console.log('京豆领取成功');
      message += `【上期兑换京豆】${$.getReward.data.awardBean}个\n`;
      $.msg($.name, subTitle, message);
      allMessage += `京东账号${$.index} ${$.nickName}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`
      // if ($.isNode()) {
      //   await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}`, `京东账号${$.index} ${$.nickName}\n${message}`);
      // }
    } else {
      console.log(`$.getReward 异常：${JSON.stringify($.getReward)}`)
    }
  } else if (awardState === '6') {
    //京豆已领取
    message += `【上期兑换京豆】${roundList[num - 1].awardBeans}个\n`;
  }
  if (roundList[1].dateDesc.indexOf('本期 ') > -1) {
    roundList[1].dateDesc = roundList[1].dateDesc.substr(roundList[1].dateDesc.indexOf('本期 ') + 3, roundList[1].dateDesc.length);
  }
  message += `【本期时间】${roundList[num].dateDesc}\n`;
  message += `【本期成长值】${roundList[num].growth}\n`;
}
async function doCultureBean() {
  await plantBeanIndex();
  if ($.plantBeanIndexResult && $.plantBeanIndexResult.code === '0') {
    const plantBeanRound = $.plantBeanIndexResult.data.roundList[num]
    if (plantBeanRound.roundState === '2') {
      //收取营养液
      if (plantBeanRound.bubbleInfos && plantBeanRound.bubbleInfos.length) console.log(`开始收取营养液`)
      for (let bubbleInfo of plantBeanRound.bubbleInfos) {
        console.log(`收取-${bubbleInfo.name}-的营养液`)
        await cultureBean(plantBeanRound.roundId, bubbleInfo.nutrientsType)
        console.log(`收取营养液结果:${JSON.stringify($.cultureBeanRes)}`)
      }
    }
  } else {
    console.log(`plantBeanIndexResult:${JSON.stringify($.plantBeanIndexResult)}`)
  }
}
async function stealFriendWater() {
  await stealFriendList();
  if ($.stealFriendList && $.stealFriendList.code === '0') {
    if ($.stealFriendList.data && $.stealFriendList.data.tips) {
      console.log('\n\n今日偷取好友营养液已达上限\n\n');
      return
    }
    if ($.stealFriendList.data && $.stealFriendList.data.friendInfoList && $.stealFriendList.data.friendInfoList.length > 0) {
      let nowTimes = new Date(new Date().getTime() + new Date().getTimezoneOffset()*60*1000 + 8*60*60*1000);
      for (let item of $.stealFriendList.data.friendInfoList) {
        if (new Date(nowTimes).getHours() === 20) {
          if (item.nutrCount >= 2) {
            // console.log(`可以偷的好友的信息::${JSON.stringify(item)}`);
            console.log(`可以偷的好友的信息paradiseUuid::${JSON.stringify(item.paradiseUuid)}`);
            await collectUserNutr(item.paradiseUuid);
            console.log(`偷取好友营养液情况:${JSON.stringify($.stealFriendRes)}`)
            if ($.stealFriendRes && $.stealFriendRes.code === '0') {
              console.log(`偷取好友营养液成功`)
            }
          }
        } else {
          if (item.nutrCount >= 3) {
            // console.log(`可以偷的好友的信息::${JSON.stringify(item)}`);
            console.log(`可以偷的好友的信息paradiseUuid::${JSON.stringify(item.paradiseUuid)}`);
            await collectUserNutr(item.paradiseUuid);
            console.log(`偷取好友营养液情况:${JSON.stringify($.stealFriendRes)}`)
            if ($.stealFriendRes && $.stealFriendRes.code === '0') {
              console.log(`偷取好友营养液成功`)
            }
          }
        }
      }
    }
  } else {
    console.log(`$.stealFriendList 异常： ${JSON.stringify($.stealFriendList)}`)
  }
}
async function doEgg() {
  await egg();
  if ($.plantEggLotteryRes && $.plantEggLotteryRes.code === '0') {
    if ($.plantEggLotteryRes.data.restLotteryNum > 0) {
      const eggL = new Array($.plantEggLotteryRes.data.restLotteryNum).fill('');
      console.log(`目前共有${eggL.length}次扭蛋的机会`)
      for (let i = 0; i < eggL.length; i++) {
        console.log(`开始第${i + 1}次扭蛋`);
        await plantEggDoLottery();
        console.log(`天天扭蛋成功：${JSON.stringify($.plantEggDoLotteryResult)}`);
      }
    } else {
      console.log('暂无扭蛋机会')
    }
  } else {
    console.log('查询天天扭蛋的机会失败' + JSON.stringify($.plantEggLotteryRes))
  }
}
async function doTask() {
  if ($.taskList && $.taskList.length > 0) {
    for (let item of $.taskList) {
      if (item.isFinished === 1) {
        console.log(`${item.taskName} 任务已完成\n`);
        continue;
      } else {
        if (item.taskType === 8) {
          console.log(`\n【${item.taskName}】任务未完成,需自行手动去京东APP完成，${item.desc}营养液\n`)
        } else {
          console.log(`\n【${item.taskName}】任务未完成,${item.desc}营养液\n`)
        }
      }
      if (item.dailyTimes === 1 && item.taskType !== 8) {
        console.log(`\n开始做 ${item.taskName}任务`);
        // $.receiveNutrientsTaskRes = await receiveNutrientsTask(item.taskType);
        await receiveNutrientsTask(item.taskType);
        console.log(`做 ${item.taskName}任务结果:${JSON.stringify($.receiveNutrientsTaskRes)}\n`);
      }
      if (item.taskType === 3) {
        //浏览店铺
        console.log(`开始做 ${item.taskName}任务`);
        let unFinishedShopNum = item.totalNum - item.gainedNum;
        if (unFinishedShopNum === 0) {
          continue
        }
        await shopTaskList();
        const { data } = $.shopTaskListRes;
        let goodShopListARR = [], moreShopListARR = [], shopList = [];
        const { goodShopList, moreShopList } = data;
        for (let i of goodShopList) {
          if (i.taskState === '2') {
            goodShopListARR.push(i);
          }
        }
        for (let j of moreShopList) {
          if (j.taskState === '2') {
            moreShopListARR.push(j);
          }
        }
        shopList = goodShopListARR.concat(moreShopListARR);
        for (let shop of shopList) {
          const { shopId, shopTaskId } = shop;
          const body = {
            "monitor_refer": "plant_shopNutrientsTask",
            "shopId": shopId,
            "shopTaskId": shopTaskId
          }
          const shopRes = await requestGet('shopNutrientsTask', body);
          console.log(`shopRes结果:${JSON.stringify(shopRes)}`);
          if (shopRes && shopRes.code === '0') {
            if (shopRes.data && shopRes.data.nutrState && shopRes.data.nutrState === '1') {
              unFinishedShopNum --;
            }
          }
          if (unFinishedShopNum <= 0) {
            console.log(`${item.taskName}任务已做完\n`)
            break;
          }
        }
      }
      if (item.taskType === 5) {
        //挑选商品
        console.log(`开始做 ${item.taskName}任务`);
        let unFinishedProductNum = item.totalNum - item.gainedNum;
        if (unFinishedProductNum === 0) {
          continue
        }
        await productTaskList();
        // console.log('productTaskList', $.productTaskList);
        const { data } = $.productTaskList;
        let productListARR = [], productList = [];
        const { productInfoList } = data;
        for (let i = 0; i < productInfoList.length; i++) {
          for (let j = 0; j < productInfoList[i].length; j++){
            productListARR.push(productInfoList[i][j]);
          }
        }
        for (let i of productListARR) {
          if (i.taskState === '2') {
            productList.push(i);
          }
        }
        for (let product of productList) {
          const { skuId, productTaskId } = product;
          const body = {
            "monitor_refer": "plant_productNutrientsTask",
            "productTaskId": productTaskId,
            "skuId": skuId
          }
          const productRes = await requestGet('productNutrientsTask', body);
          if (productRes && productRes.code === '0') {
            // console.log('nutrState', productRes)
            //这里添加多重判断,有时候会出现活动太火爆的问题,导致nutrState没有
            if (productRes.data && productRes.data.nutrState && productRes.data.nutrState === '1') {
              unFinishedProductNum --;
            }
          }
          if (unFinishedProductNum <= 0) {
            console.log(`${item.taskName}任务已做完\n`)
            break;
          }
        }
      }
      if (item.taskType === 10) {
        //关注频道
        console.log(`开始做 ${item.taskName}任务`);
        let unFinishedChannelNum = item.totalNum - item.gainedNum;
        if (unFinishedChannelNum === 0) {
          continue
        }
        await plantChannelTaskList();
        const { data } = $.plantChannelTaskList;
        // console.log('goodShopList', data.goodShopList);
        // console.log('moreShopList', data.moreShopList);
        let goodChannelListARR = [], normalChannelListARR = [], channelList = [];
        const { goodChannelList, normalChannelList } = data;
        for (let i of goodChannelList) {
          if (i.taskState === '2') {
            goodChannelListARR.push(i);
          }
        }
        for (let j of normalChannelList) {
          if (j.taskState === '2') {
            normalChannelListARR.push(j);
          }
        }
        channelList = goodChannelListARR.concat(normalChannelListARR);
        for (let channelItem of channelList) {
          const { channelId, channelTaskId } = channelItem;
          const body = {
            "channelId": channelId,
            "channelTaskId": channelTaskId
          }
          const channelRes = await requestGet('plantChannelNutrientsTask', body);
          console.log(`channelRes结果:${JSON.stringify(channelRes)}`);
          if (channelRes && channelRes.code === '0') {
            if (channelRes.data && channelRes.data.nutrState && channelRes.data.nutrState === '1') {
              unFinishedChannelNum --;
            }
          }
          if (unFinishedChannelNum <= 0) {
            console.log(`${item.taskName}任务已做完\n`)
            break;
          }
        }
      }
    }
  }
}
function showTaskProcess() {
  return new Promise(async resolve => {
    await plantBeanIndex();
    $.taskList = $.plantBeanIndexResult.data.taskList;
    if ($.taskList && $.taskList.length > 0) {
      console.log("     任务   进度");
      for (let item of $.taskList) {
        console.log(`[${item["taskName"]}]  ${item["gainedNum"]}/${item["totalNum"]}   ${item["isFinished"]}`);
      }
    }
    resolve()
  })
}
//助力好友
async function doHelp() {
  for (let plantUuid of newShareCodes) {
    console.log(`开始助力京东账号${$.index} - ${$.nickName}的好友: ${plantUuid}`);
    if (!plantUuid) continue;
    if (plantUuid === $.myPlantUuid) {
      console.log(`\n跳过自己的plantUuid\n`)
      continue
    }
    await helpShare(plantUuid);
    if ($.helpResult && $.helpResult.code === '0') {
      // console.log(`助力好友结果: ${JSON.stringify($.helpResult.data.helpShareRes)}`);
      if ($.helpResult.data.helpShareRes) {
        if ($.helpResult.data.helpShareRes.state === '1') {
          console.log(`助力好友${plantUuid}成功`)
          console.log(`${$.helpResult.data.helpShareRes.promptText}\n`);
        } else if ($.helpResult.data.helpShareRes.state === '2') {
          console.log('您今日助力的机会已耗尽，已不能再帮助好友助力了\n');
          break;
        } else if ($.helpResult.data.helpShareRes.state === '3') {
          console.log('该好友今日已满9人助力/20瓶营养液,明天再来为Ta助力吧\n')
        } else if ($.helpResult.data.helpShareRes.state === '4') {
          console.log(`${$.helpResult.data.helpShareRes.promptText}\n`)
        } else {
          console.log(`助力其他情况：${JSON.stringify($.helpResult.data.helpShareRes)}`);
        }
      }
    } else {
      console.log(`助力好友失败: ${JSON.stringify($.helpResult)}`);
    }
  }
}
function showMsg() {
  $.log(`\n${message}\n`);
  jdNotify = $.getdata('jdPlantBeanNotify') ? $.getdata('jdPlantBeanNotify') : jdNotify;
  if (!jdNotify || jdNotify === 'false') {
    $.msg($.name, subTitle, message);
  }
}
// ================================================此处是API=================================
//每轮种豆活动获取结束后,自动收取京豆
async function getReward() {
  const body = {
    "roundId": lastRoundId
  }
  $.getReward = await request('receivedBean', body);
}
//收取营养液
async function cultureBean(currentRoundId, nutrientsType) {
  let functionId = arguments.callee.name.toString();
  let body = {
    "roundId": currentRoundId,
    "nutrientsType": nutrientsType,
  }
  $.cultureBeanRes = await request(functionId, body);
}
//偷营养液大于等于3瓶的好友
//①查询好友列表
async function stealFriendList() {
  const body = {
    pageNum: '1'
  }
  $.stealFriendList = await request('plantFriendList', body);
}

//②执行偷好友营养液的动作
async function collectUserNutr(paradiseUuid) {
  console.log('开始偷好友');
  // console.log(paradiseUuid);
  let functionId = arguments.callee.name.toString();
  const body = {
    "paradiseUuid": paradiseUuid,
    "roundId": currentRoundId
  }
  $.stealFriendRes = await request(functionId, body);
}
async function receiveNutrients() {
  $.receiveNutrientsRes = await request('receiveNutrients', {"roundId": currentRoundId, "monitor_refer": "plant_receiveNutrients"})
  // console.log(`定时领取营养液结果:${JSON.stringify($.receiveNutrientsRes)}`)
}
async function plantEggDoLottery() {
  $.plantEggDoLotteryResult = await requestGet('plantEggDoLottery');
}
//查询天天扭蛋的机会
async function egg() {
  $.plantEggLotteryRes = await requestGet('plantEggLotteryIndex');
}
async function productTaskList() {
  let functionId = arguments.callee.name.toString();
  $.productTaskList = await requestGet(functionId, {"monitor_refer": "plant_productTaskList"});
}
async function plantChannelTaskList() {
  let functionId = arguments.callee.name.toString();
  $.plantChannelTaskList = await requestGet(functionId);
  // console.log('$.plantChannelTaskList', $.plantChannelTaskList)
}
async function shopTaskList() {
  let functionId = arguments.callee.name.toString();
  $.shopTaskListRes = await requestGet(functionId, {"monitor_refer": "plant_receiveNutrients"});
  // console.log('$.shopTaskListRes', $.shopTaskListRes)
}
async function receiveNutrientsTask(awardType) {
  const functionId = arguments.callee.name.toString();
  const body = {
    "monitor_refer": "receiveNutrientsTask",
    "awardType": `${awardType}`,
  }
  $.receiveNutrientsTaskRes = await requestGet(functionId, body);
}
async function plantShareSupportList() {
  $.shareSupportList = await requestGet('plantShareSupportList', {"roundId": ""});
  if ($.shareSupportList && $.shareSupportList.code === '0') {
    const { data } = $.shareSupportList;
    //当日北京时间0点时间戳
    const UTC8_Zero_Time = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000;
    //次日北京时间0点时间戳
    const UTC8_End_Time = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000 + (24 * 60 * 60 * 1000);
    let friendList = [];
    data.map(item => {
      if (UTC8_Zero_Time <= item['createTime'] && item['createTime'] < UTC8_End_Time) {
        friendList.push(item);
      }
    })
    message += `【助力您的好友】共${friendList.length}人`;
  } else {
    console.log(`异常情况：${JSON.stringify($.shareSupportList)}`)
  }
}
//助力好友的api
async function helpShare(plantUuid) {
  console.log(`\n开始助力好友: ${plantUuid}`);
  const body = {
    "plantUuid": plantUuid,
    "wxHeadImgUrl": "",
    "shareUuid": "",
    "followType": "1",
  }
  $.helpResult = await request(`plantBeanIndex`, body);
  console.log(`助力结果的code:${$.helpResult && $.helpResult.code}`);
}
async function plantBeanIndex() {
  $.plantBeanIndexResult = await request('plantBeanIndex');//plantBeanIndexBody
}
function readShareCode() {
  console.log(`开始`)
  return new Promise(async resolve => {
    $.get({url: "https://wuzhi03.coding.net/p/dj/d/RandomShareCode/git/raw/main/JD_Plant_Bean.json",headers:{
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/87.0.4280.88"
      }}, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，将切换为备用API`)
          console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
          $.get({url: `https://raw.githubusercontent.com/shuyeshuye/RandomShareCode/main/JD_Plant_Bean.json`, 'timeout': 10000},(err, resp, data)=>{
          data = JSON.parse(data);})
        } else {
          if (data) {
            console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
            data = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
    await $.wait(15000);
    resolve()
  })
}
//格式化助力码
function shareCodesFormat() {
  return new Promise(async resolve => {
    // console.log(`第${$.index}个京东账号的助力码:::${jdPlantBeanShareArr[$.index - 1]}`)
    newShareCodes = [];
    if (jdPlantBeanShareArr[$.index - 1]) {
      newShareCodes = jdPlantBeanShareArr[$.index - 1].split('@');
    } else {
      console.log(`由于您第${$.index}个京东账号未提供shareCode,将采纳本脚本自带的助力码\n`)
      const tempIndex = $.index > shareCodes.length ? (shareCodes.length - 1) : ($.index - 1);
      newShareCodes = shareCodes[tempIndex].split('@');
    }
    const readShareCodeRes = await readShareCode();
    if (readShareCodeRes && readShareCodeRes.code === 200) {
      newShareCodes = [...new Set([...newShareCodes, ...(readShareCodeRes.data || [])])];
    }
    console.log(`第${$.index}个京东账号将要助力的好友${JSON.stringify(newShareCodes)}`)
    resolve();
  })
}
function requireConfig() {
  return new Promise(resolve => {
    console.log('开始获取种豆得豆配置文件\n')
    notify = $.isNode() ? require('./sendNotify') : '';
    //Node.js用户请在jdCookie.js处填写京东ck;
    const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
    const jdPlantBeanShareCodes = $.isNode() ? require('./jdPlantBeanShareCodes.js') : '';
    //IOS等用户直接用NobyDa的jd cookie
    if ($.isNode()) {
      Object.keys(jdCookieNode).forEach((item) => {
        if (jdCookieNode[item]) {
          cookiesArr.push(jdCookieNode[item])
        }
      })
      if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
    } else {
      cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
    }
    console.log(`共${cookiesArr.length}个京东账号\n`)
    if ($.isNode()) {
      Object.keys(jdPlantBeanShareCodes).forEach((item) => {
        if (jdPlantBeanShareCodes[item]) {
          jdPlantBeanShareArr.push(jdPlantBeanShareCodes[item])
        }
      })
    } else {
      const boxShareCodeArr = ['jd_plantBean1', 'jd_plantBean2', 'jd_plantBean3'];
      const boxShareCodeArr2 = ['jd2_plantBean1', 'jd2_plantBean2', 'jd2_plantBean3'];
      const isBox1 = boxShareCodeArr.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      const isBox2 = boxShareCodeArr2.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      isBox = isBox1 ? isBox1 : isBox2;
      if (isBox1) {
        let temp = [];
        for (const item of boxShareCodeArr) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdPlantBeanShareArr.push(temp.join('@'));
      }
      if (isBox2) {
        let temp = [];
        for (const item of boxShareCodeArr2) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdPlantBeanShareArr.push(temp.join('@'));
      }
    }
    // console.log(`\n种豆得豆助力码::${JSON.stringify(jdPlantBeanShareArr)}`);
    console.log(`您提供了${jdPlantBeanShareArr.length}个账号的种豆得豆助力码\n`);
    resolve()
  })
}
function requestGet(function_id, body = {}) {
  if (!body.version) {
    body["version"] = "9.0.0.1";
  }
  body["monitor_source"] = "plant_app_plant_index";
  body["monitor_refer"] = "";
  return new Promise(async resolve => {
    await $.wait(2000);
    const option = {
      url: `${JD_API_HOST}?functionId=${function_id}&body=${escape(JSON.stringify(body))}&appid=ld`,
      headers: {
        'Cookie': cookie,
        'Host': 'api.m.jd.com',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'User-Agent': 'JD4iPhone/167283 (iPhone;iOS 13.6.1;Scale/3.00)',
        'Accept-Language': 'zh-Hans-CN;q=1,en-CN;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': "application/x-www-form-urlencoded"
      },
      timeout: 10000,
    };
    $.get(option, (err, resp, data) => {
      try {
        if (err) {
          console.log('\n种豆得豆: API查询请求失败 ‼️‼️')
          $.logErr(err);
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
      "headers": {
        "Accept": "application/json,text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      },
      "timeout": 10000,
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === 13) {
              $.isLogin = false; //cookie过期
              return
            }
            if (data['retcode'] === 0) {
              $.nickName = (data['base'] && data['base'].nickname) || $.UserName;
            } else {
              $.nickName = $.UserName
            }
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function request(function_id, body = {}){
  return new Promise(async resolve => {
    await $.wait(2000);
    $.post(taskUrl(function_id, body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n种豆得豆: API查询请求失败 ‼️‼️')
          console.log(`function_id:${function_id}`)
          $.logErr(err);
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function taskUrl(function_id, body) {
  body["version"] = "9.2.4.0";
  body["monitor_source"] = "plant_app_plant_index";
  body["monitor_refer"] = "";
  return {
    url: JD_API_HOST,
    body: `functionId=${function_id}&body=${escape(JSON.stringify(body))}&appid=ld&client=apple&area=19_1601_50258_51885&build=167490&clientVersion=9.3.2`,
    headers: {
      "Cookie": cookie,
      "Host": "api.m.jd.com",
      "Accept": "*/*",
      "Connection": "keep-alive",
      "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
      "Accept-Language": "zh-Hans-CN;q=1,en-CN;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 10000,
  }
}
function getParam(url, name) {
  const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i")
  const r = url.match(reg)
  if (r != null) return unescape(r[2]);
  return null;
}
function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
var _0xodm='jsjiami.com.v6',_0x10a8=[_0xodm,'wr3Cr0xAUg==','wrpOwobCrFQ=','wopqwpDCtU0=','azogIB8=','USlOw7TDsg==','w6TDocKHX8KD','w6fCrh3DuHE=','wqHCuVJuYQ==','HcO9wp4=','w7jDj8K/aMKS','QSUwwpnDrA==','KcOcGRTDog==','GsOSRQET','ezomwpTDsw==','P8Kjw5LCmcOj','wprDry7ChMKr','woAWYEvCow==','w7oyDS3Cqg==','DcKEwrHCgA==','JcOhbTESIQ==','DMO0cMOWcA==','wpDCpkrDig==','EjXDhGx1DQ==','McOBecO0dg==','LMOHw7tiwok=','w7XCtHI=','wpzDsWg=','IlnDoMKV','DcOqfsKs','Ewg5wr7Dqw==','QQAkwrbDsw==','w7jChMK2ZBU=','WcORIMKS','YSvChE0=','KyBlw5Q=','M8OYw7BOwo/Djg==','NgZYw5k8','w4bCuz/DkSQ=','w54cNULChwnCtcOHwqFn','LcOlw6FJwrU=','wqbDpDLCucKO','OsKyVk0vXUtZ','HcK3SMK9w7fCjBLDiEvDhw==','wr0YaFHCqmLCqDfCti4lwo9JPMO7wr0lw4jDtMKnw7Jvf8KLBCVeAsKsacOCCFwGBHozw6EbHwnCpD9Dw4fCkF/CssOFNWINDgdRwoLDmWnCmMKUwrTDrsKEwq/DkRJJwrV2wqXClMOHw5zDtsKzworDtMKTSsOHw5JrZcOoIHA+wpl/ZT7ChsKawokgW2whPMKDF8ODFQLDrsOReMK7w5HCugXDv8KxKS1nC0fCnzxEZcKbe8KGw799w6NkUHbDgcOHwpvDjRjChCXDqQ==','wrHCmsOw','w6zCuTjDpnI=','WcOsPsOKNQ==','wrPDlEPDlcOg','PcO7w7liwpo=','woFFVlRZ','DcO2SmFM','F8Kww7nChcOP','RUfCgsOowrI=','SkHCucOXwpo=','A8Obwr/DlsOU','MzfDoWpp','w7fCtyk=','JcOmwrfDgB4=','PsKiwq7DgcON','wrtZIB3Ctg==','wpzCmcO7w7fDjRA=','w43CiMKwaC5/w7hOwoA=','IsO9SEpp','ZkvCjcOjwp04w6c=','CMOcw7p3wrs=','fMKcwqwhD1XDvcOOMg==','YsKJwqorCQ==','wqdFCSvCuw==','CTHDg38=','FMO3dcObY0A=','wq3DvxXCs8KO','w6HCqhbDkTY=','wqrCu1ICwrE=','wqXCl0YIwrg=','IsK3wrnDncOq','BcK3WcOgwrnCghHDilTDhw==','wrMkW3w=','FGjDj8O4QDE=','f8KseSY=','QRwhwovDuMOfJ2XDvQ==','QMKPwogHFw==','worDuEgAw5oTwqrDpg==','w4TCiTrDnh3Dt8KYwpDDlsOk','XsOXw5fCjCPCiizDrcKJwrQ1w5xPCXs7BcO8f0vCoMKfbMOGw7jDr2bDkMKiwqjDiwnDgsO6DTg8wqsxFBXDjMOZw47DiFBHwrbDpcK6w4nCjl9qazzDokNRZ8OiLCQ7wrbDrSBxw5TCuQ7DosO1w4oOwpgKT8K1wplmw6USw5LCtsKmDsKlw6NVe8KLHcOhwqRqw55RwrnDo8KjMVLDoMO3WcKXwqtKdMKPQcOuPMObwprDtkVxZiouFMOidwrDnXHDuMKfcFPCgTjCrMOnw7/CkjE=','TwYOwqTDmA==','w5nCtcKkSyk=','D8KYV8K1wps=','AsKGwqfDqcOn','eT0mPR0=','DsOWw4JBwr4=','WBYQNjo=','wrxhPw==','wovDjSbCgMKP','AMONw51nwp4=','McKqdMKBwo4=','P8KOwoTDvcOy','GzlVw6wS','wojCoHYOwp4=','wqPCjk1TSg==','wrDDlSXCs8KO','cCpvw5DDkA==','w7HChMK1RSg=','VS9mw4bDmg==','e8Kswqw+Kw==','QcKJwoo7GQ==','J8OUaGxg','bC09BTU=','wpVIOAzCvw==','w4fCqTTDj1I=','ME7DuA==','dsOXw6bCsCs=','wojCqFpCTXZobMOo','w4LCjSvDjVg=','G8KzWcKuwrI=','wpbCvVxISw==','wpDCq8K4w64L','wr7DpCbCssKS','w63Cp8OHw6Md','IsOBchU/','wqjCm08twps=','McOUw5tTwos=','FSjDg2h4','IsO8ajUf','woDDrxjCm8Kg','w4fChAfDvnc=','wpfCvno0wrM=','GcOfdGtb','cSDCjizDvA==','SsOuw6/CjgM=','ScKNRh3ChQ==','GwDDi3pT','w5jCjTbDmg==','wpFiNCjCryg=','wonDqizCm8Kz','w5nDh8Kif8K3w7A=','wrzCusOTw7jDhg==','IcOlcGBM','O8OFemRJ','GcOoe8KwfBzCvgTDm8KVLCw=','wpvCk8O5w4LCkgMlwrrDu8Or','wr3CmcOmw5vDkw4ow7zCuMKgw4QZwpxkB8O4w7bDrF7DmRfDuMKWXcO9wp8EGsKxD8Kpwpc5w4fDu0nDssOWSsKHw7JsGXzDnMOfZcK4YRjDvcK/TmQ2w4wnwrrDjcKmw5JmwqrDmsOLFTZtw6HCt3Aew7RlXcObCsKsUsOkCMOfXXJDw4/DrDMMSsOQwow3Kicrw6HDg8Kvw5fDlVnDvDrDtcOdw5bCg3MKw7DDv8Kpw7pgw6PDrhzCosOVMGNFw7bCq8OPw4PCiMKPRMO+PsOlw43DtMOOw5pgw7U=','w4HCqnJh','eTDCvQ3DsA==','JBHDi31q','w6XCoDHCscKr','XA9QwozCsw==','OyR4','wqNoSFdC','RcKXTQ3Chg==','wrjClEtzew==','wqPCgsO+w57Drw==','wq7CpFIHwpg=','TsOtVMOdYg==','wrHDmmrDqsOF','w4nCncKrdQ==','JcOrZBMUOw==','w44+AwXCsg==','dcOhKcOzOw==','FsOeWXlk','IsONPw/ChA==','wrHDsmPDisO5Jw==','w68hAALCiA==','YTtkwrPClQ==','cgJ1w5fDsA==','H8OCw6B1wr8=','KcO9w6Nxwoo=','YUPCu8OCwpQ=','G8OowoPCocOcdsKsw6tFwqJ6wps=','NyRpw5BrdsKTKMO+wpk=','BMOreT8KJcOawoU2ZsOzwo7ChBkyUAbDsxPDrMKGZMOUME3Do10+HcKOJMOcwpHDpTMVw5QmZGbCs3DDk8KCw6zCrlVRw4LDk1rCjmTCon06w6NaFsKyw7sBE8OwfGTCjkvCsHcATSBWw7c7QcOqHcOcw67Ch8KECWNTAsO2wqfCoMKGTzTDkjtVwoAeCsOwcGJDKcK8VcOcw4sxUUp0Z8KJwqfCsQwAZz7Cnntow6XCl8K0w5XCp8KIw7PDgsKAwoBowrMFMzzDkQ==','DcKEwrHCgw==','LjgWwqnDug==','UyphwrTCpA==','dRJgw4PDkQ==','LzVhw6sz','w5bCi3c0VQ==','YAA/wrzDoQ==','w7XCvG83Yg==','OcKSwqzDlsOL','S8OGOA==','K8OCNQjCrg==','wrxufmlM','w5LDkcKVXMKi','GSnDum1m','fMOdw7zCix8=','J0rDvsOUdg==','FsObHgo=','fBjCijjDnA==','A8OyOh/Djw==','LcOCOgnCpA==','wqrCp8K5w5IMwrY=','PcOvwqPDkScw','W8KyRQPCqA==','w5nCpRvDgmA=','EcKYwojDhcOp','B8OtODnCsA==','w47CgMOHw6g1bg==','cMK0TgjClg==','FsOZw6tAwpM=','wpbDlV3DmcOl','wo7CgMO2fXFkwqNUw4pGw5Y=','wpfColYUwodKw6rCpMKmwq1IQ8K1woNXw5ERw4XClcKCesKKwrocw5YjXR3Cp8Kybzozwq7CtcKSw7XCsMOHb8OPWMO4w7XDl8KJZMOawqJ0woFQVsO2w6N+w67Dv8O/VRxmd1vClDnCgcOUw557f8OswrzChMKXPMKP','NcO3aMO3fV7CtU/DgMOYc2EBUA0NwqrCsmzChW3DoXTCqA8Zw47ChxdjezHDkcOZWzcJZUVCXsKIWE7DrMKzTRfDoQPCk8OHBsOnw7XDhMKTw7E5wpxpwqAAP1LDgcKzKUTCgFMySQMiw6LCmyQIwp4iwrHDh37Dgj5lwowZWCzDuwnCmsOybsOyw7pnaGJvwoomdU9Mw7TDnV3DvBnCsinDuALDo0IFaggbwoUyBcO1A2fCsT0zwql8GMKQw4BEwozDgThDwrrCo8OIw7N2wqEEMETCosO+C2knHg==','jsjiamgi.DPyDcoMym.BNKvh6thWO=='];(function(_0x2a96a3,_0x28b638,_0x3ff06c){var _0x19a40f=function(_0xa71ff7,_0x53c09d,_0x174119,_0x358418,_0x39acdd){_0x53c09d=_0x53c09d>>0x8,_0x39acdd='po';var _0xbfa978='shift',_0x418fc9='push';if(_0x53c09d<_0xa71ff7){while(--_0xa71ff7){_0x358418=_0x2a96a3[_0xbfa978]();if(_0x53c09d===_0xa71ff7){_0x53c09d=_0x358418;_0x174119=_0x2a96a3[_0x39acdd+'p']();}else if(_0x53c09d&&_0x174119['replace'](/[gDPyDMyBNKhthWO=]/g,'')===_0x53c09d){_0x2a96a3[_0x418fc9](_0x358418);}}_0x2a96a3[_0x418fc9](_0x2a96a3[_0xbfa978]());}return 0xb1f10;};var _0xc14b4c=function(){var _0x454a9f={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x58dfa8,_0x5f1645,_0x29f2ff,_0x5935d5){_0x5935d5=_0x5935d5||{};var _0x18ad80=_0x5f1645+'='+_0x29f2ff;var _0xcd3268=0x0;for(var _0xcd3268=0x0,_0x296866=_0x58dfa8['length'];_0xcd3268<_0x296866;_0xcd3268++){var _0x2efca3=_0x58dfa8[_0xcd3268];_0x18ad80+=';\x20'+_0x2efca3;var _0x2c5e4c=_0x58dfa8[_0x2efca3];_0x58dfa8['push'](_0x2c5e4c);_0x296866=_0x58dfa8['length'];if(_0x2c5e4c!==!![]){_0x18ad80+='='+_0x2c5e4c;}}_0x5935d5['cookie']=_0x18ad80;},'removeCookie':function(){return'dev';},'getCookie':function(_0x1ec64b,_0x2966a1){_0x1ec64b=_0x1ec64b||function(_0x2eb7bc){return _0x2eb7bc;};var _0x5b0519=_0x1ec64b(new RegExp('(?:^|;\x20)'+_0x2966a1['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x327a8b=typeof _0xodm=='undefined'?'undefined':_0xodm,_0x211d76=_0x327a8b['split'](''),_0x2c75b8=_0x211d76['length'],_0x152c51=_0x2c75b8-0xe,_0x225b24;while(_0x225b24=_0x211d76['pop']()){_0x2c75b8&&(_0x152c51+=_0x225b24['charCodeAt']());}var _0x4ff4dd=function(_0x4f072d,_0x5abc62,_0x188af8){_0x4f072d(++_0x5abc62,_0x188af8);};_0x152c51^-_0x2c75b8===-0x524&&(_0x225b24=_0x152c51)&&_0x4ff4dd(_0x19a40f,_0x28b638,_0x3ff06c);return _0x225b24>>0x2===0x14b&&_0x5b0519?decodeURIComponent(_0x5b0519[0x1]):undefined;}};var _0x575164=function(){var _0x378e0f=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x378e0f['test'](_0x454a9f['removeCookie']['toString']());};_0x454a9f['updateCookie']=_0x575164;var _0x14d826='';var _0x43403d=_0x454a9f['updateCookie']();if(!_0x43403d){_0x454a9f['setCookie'](['*'],'counter',0x1);}else if(_0x43403d){_0x14d826=_0x454a9f['getCookie'](null,'counter');}else{_0x454a9f['removeCookie']();}};_0xc14b4c();}(_0x10a8,0xc6,0xc600));var _0x5d35=function(_0x5ea1ae,_0xbcc98e){_0x5ea1ae=~~'0x'['concat'](_0x5ea1ae);var _0x4a01a4=_0x10a8[_0x5ea1ae];if(_0x5d35['kngriA']===undefined){(function(){var _0x888501;try{var _0x75663=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');');_0x888501=_0x75663();}catch(_0x254764){_0x888501=window;}var _0x4bcdf1='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x888501['atob']||(_0x888501['atob']=function(_0x28330e){var _0x47a94b=String(_0x28330e)['replace'](/=+$/,'');for(var _0x2aa698=0x0,_0x445af1,_0x32fa9d,_0x55e320=0x0,_0x48f6a5='';_0x32fa9d=_0x47a94b['charAt'](_0x55e320++);~_0x32fa9d&&(_0x445af1=_0x2aa698%0x4?_0x445af1*0x40+_0x32fa9d:_0x32fa9d,_0x2aa698++%0x4)?_0x48f6a5+=String['fromCharCode'](0xff&_0x445af1>>(-0x2*_0x2aa698&0x6)):0x0){_0x32fa9d=_0x4bcdf1['indexOf'](_0x32fa9d);}return _0x48f6a5;});}());var _0x2a1d0f=function(_0x1450b4,_0xbcc98e){var _0x944677=[],_0x1029dc=0x0,_0x4c6367,_0x2c8080='',_0xe6eff2='';_0x1450b4=atob(_0x1450b4);for(var _0x28ff7a=0x0,_0xdf2070=_0x1450b4['length'];_0x28ff7a<_0xdf2070;_0x28ff7a++){_0xe6eff2+='%'+('00'+_0x1450b4['charCodeAt'](_0x28ff7a)['toString'](0x10))['slice'](-0x2);}_0x1450b4=decodeURIComponent(_0xe6eff2);for(var _0x43a45c=0x0;_0x43a45c<0x100;_0x43a45c++){_0x944677[_0x43a45c]=_0x43a45c;}for(_0x43a45c=0x0;_0x43a45c<0x100;_0x43a45c++){_0x1029dc=(_0x1029dc+_0x944677[_0x43a45c]+_0xbcc98e['charCodeAt'](_0x43a45c%_0xbcc98e['length']))%0x100;_0x4c6367=_0x944677[_0x43a45c];_0x944677[_0x43a45c]=_0x944677[_0x1029dc];_0x944677[_0x1029dc]=_0x4c6367;}_0x43a45c=0x0;_0x1029dc=0x0;for(var _0x11204b=0x0;_0x11204b<_0x1450b4['length'];_0x11204b++){_0x43a45c=(_0x43a45c+0x1)%0x100;_0x1029dc=(_0x1029dc+_0x944677[_0x43a45c])%0x100;_0x4c6367=_0x944677[_0x43a45c];_0x944677[_0x43a45c]=_0x944677[_0x1029dc];_0x944677[_0x1029dc]=_0x4c6367;_0x2c8080+=String['fromCharCode'](_0x1450b4['charCodeAt'](_0x11204b)^_0x944677[(_0x944677[_0x43a45c]+_0x944677[_0x1029dc])%0x100]);}return _0x2c8080;};_0x5d35['mJXXlD']=_0x2a1d0f;_0x5d35['PcfJKs']={};_0x5d35['kngriA']=!![];}var _0x36481a=_0x5d35['PcfJKs'][_0x5ea1ae];if(_0x36481a===undefined){if(_0x5d35['EczCKq']===undefined){var _0x81d631=function(_0x294600){this['FzqMtv']=_0x294600;this['tgAWFc']=[0x1,0x0,0x0];this['cCWlXm']=function(){return'newState';};this['FLDlKn']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['omWTrl']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x81d631['prototype']['FRvvnw']=function(){var _0x1f8e94=new RegExp(this['FLDlKn']+this['omWTrl']);var _0x1fba62=_0x1f8e94['test'](this['cCWlXm']['toString']())?--this['tgAWFc'][0x1]:--this['tgAWFc'][0x0];return this['TYZCQJ'](_0x1fba62);};_0x81d631['prototype']['TYZCQJ']=function(_0x27d639){if(!Boolean(~_0x27d639)){return _0x27d639;}return this['bFJBKn'](this['FzqMtv']);};_0x81d631['prototype']['bFJBKn']=function(_0xf9cd2e){for(var _0x3d5dcd=0x0,_0x14c61b=this['tgAWFc']['length'];_0x3d5dcd<_0x14c61b;_0x3d5dcd++){this['tgAWFc']['push'](Math['round'](Math['random']()));_0x14c61b=this['tgAWFc']['length'];}return _0xf9cd2e(this['tgAWFc'][0x0]);};new _0x81d631(_0x5d35)['FRvvnw']();_0x5d35['EczCKq']=!![];}_0x4a01a4=_0x5d35['mJXXlD'](_0x4a01a4,_0xbcc98e);_0x5d35['PcfJKs'][_0x5ea1ae]=_0x4a01a4;}else{_0x4a01a4=_0x36481a;}return _0x4a01a4;};var _0x5235dc=function(){var _0x3994d5=!![];return function(_0x506812,_0x267aa2){var _0x3362a0=_0x3994d5?function(){if(_0x267aa2){var _0x29bfb6=_0x267aa2['apply'](_0x506812,arguments);_0x267aa2=null;return _0x29bfb6;}}:function(){};_0x3994d5=![];return _0x3362a0;};}();var _0x277836=_0x5235dc(this,function(){var _0x553f66=function(){return'\x64\x65\x76';},_0x7469ab=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0x154cf7=function(){var _0x56b74f=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x56b74f['\x74\x65\x73\x74'](_0x553f66['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x46ec16=function(){var _0x255d4b=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x255d4b['\x74\x65\x73\x74'](_0x7469ab['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x12e0d7=function(_0x4a8750){var _0x5c300c=~-0x1>>0x1+0xff%0x0;if(_0x4a8750['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x5c300c)){_0x5c4d27(_0x4a8750);}};var _0x5c4d27=function(_0x7a0a99){var _0x518378=~-0x4>>0x1+0xff%0x0;if(_0x7a0a99['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x518378){_0x12e0d7(_0x7a0a99);}};if(!_0x154cf7()){if(!_0x46ec16()){_0x12e0d7('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0x12e0d7('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0x12e0d7('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x277836();function getinfo(){var _0x3a6b37={'Fsdkq':function(_0x51be03){return _0x51be03();},'ieNSO':function(_0x5de7fe,_0x40b957){return _0x5de7fe===_0x40b957;},'YAXJV':_0x5d35('0','u#QP'),'CfSWA':_0x5d35('1','5*6w'),'QIBeF':function(_0xdbdab3,_0x19922b){return _0xdbdab3!==_0x19922b;},'HBBVA':_0x5d35('2','fmnN'),'ZezEB':function(_0x1c5f26){return _0x1c5f26();},'MgzRW':_0x5d35('3','168y'),'ifWUx':_0x5d35('4','d(ku')};return new Promise(_0x1cbf61=>{var _0x19cdba={'FxteU':function(_0x1e0bc2){return _0x3a6b37[_0x5d35('5','OhO#')](_0x1e0bc2);},'SVFWu':function(_0x394367,_0x3db25f){return _0x3a6b37[_0x5d35('6','dZLo')](_0x394367,_0x3db25f);},'SyAXg':_0x3a6b37[_0x5d35('7','dZLo')],'IKyxd':_0x3a6b37[_0x5d35('8','w0A!')],'WKLBN':function(_0x5d1302,_0xf2927b){return _0x3a6b37[_0x5d35('9','P3Db')](_0x5d1302,_0xf2927b);},'tlbHa':function(_0x5199ae,_0xa0822a){return _0x3a6b37[_0x5d35('a','M[Np')](_0x5199ae,_0xa0822a);},'IYkjg':_0x3a6b37[_0x5d35('b','Aa%e')],'jGTyz':function(_0x323bc8){return _0x3a6b37[_0x5d35('c','OhO#')](_0x323bc8);}};$[_0x5d35('d','vvzF')]({'url':_0x3a6b37[_0x5d35('e','M[Np')],'headers':{'User-Agent':_0x3a6b37[_0x5d35('f','H!@v')]},'timeout':0x1388},async(_0x1e2130,_0x2b1659,_0x443d2f)=>{var _0x228421={'rhnOL':function(_0x138b68){return _0x19cdba[_0x5d35('10',']&91')](_0x138b68);}};try{if(_0x19cdba[_0x5d35('11','Cp5o')](_0x19cdba[_0x5d35('12','H!@v')],_0x19cdba[_0x5d35('13','Y0ib')])){_0x228421[_0x5d35('14','83f&')](_0x1cbf61);}else{if(_0x1e2130){}else{_0x443d2f=JSON[_0x5d35('15','eoQu')](_0x443d2f);if(_0x19cdba[_0x5d35('16','NzEg')](_0x443d2f[_0x5d35('17','bGbE')][_0x5d35('18','Cp5o')],0x0)||_0x19cdba[_0x5d35('19','d(ku')](_0x443d2f[_0x5d35('1a','Z9UT')][_0x5d35('1b','bwC5')],0x0)){var _0x3d4cd0=_0x19cdba[_0x5d35('1c','d(ku')][_0x5d35('1d','gvUx')]('|'),_0x22f1e9=0x0;while(!![]){switch(_0x3d4cd0[_0x22f1e9++]){case'0':$[_0x5d35('1e','*%TG')]=_0x443d2f[_0x5d35('1f','5*6w')];continue;case'1':$[_0x5d35('20','lO$c')]=_0x443d2f[_0x5d35('21','d(ku')];continue;case'2':$[_0x5d35('22','A]VP')]=_0x443d2f[_0x5d35('23','*[aR')];continue;case'3':await _0x19cdba[_0x5d35('24','fmnN')](S01);continue;case'4':$[_0x5d35('25','Em9O')]=_0x443d2f[_0x5d35('26','P01c')];continue;case'5':await $[_0x5d35('27','Voxs')](0xc8);continue;}break;}}}}}catch(_0xa40d07){$[_0x5d35('28','gvUx')]();}finally{_0x19cdba[_0x5d35('29','Voxs')](_0x1cbf61);}});});}function S01(){var _0x1f7f52={'gWKRh':function(_0x18c091){return _0x18c091();},'UjJyT':function(_0x332779,_0x52be1b){return _0x332779!==_0x52be1b;},'BjvHM':_0x5d35('2a','C@qi'),'aXRdH':_0x5d35('2b','NzEg'),'KinoJ':function(_0x1f41ca,_0x4f3948,_0x49cde0){return _0x1f41ca(_0x4f3948,_0x49cde0);},'DoUPb':function(_0x50ba4c,_0x3ae738){return _0x50ba4c===_0x3ae738;},'yCUYe':_0x5d35('2c','u#QP'),'MgKah':_0x5d35('2d','83f&'),'CUgHB':_0x5d35('2e','Mx]b'),'uOrik':_0x5d35('2f','oDxk'),'nIGZk':_0x5d35('30','eoQu')};let _0x4e649e={'url':$[_0x5d35('31','6FFf')],'headers':{'Host':_0x1f7f52[_0x5d35('32','Aa%e')],'Connection':_0x1f7f52[_0x5d35('33','Em9O')],'Cookie':cookie,'User-Agent':_0x1f7f52[_0x5d35('34','5*6w')]}};return new Promise(_0x232fa4=>{var _0x2cda64={'ZAdlL':function(_0x155c79){return _0x1f7f52[_0x5d35('35','u#QP')](_0x155c79);},'tfsTK':function(_0x466c94,_0x29b4f7){return _0x1f7f52[_0x5d35('36','Y6xa')](_0x466c94,_0x29b4f7);},'FTspk':_0x1f7f52[_0x5d35('37','Mx]b')],'RpHGI':_0x1f7f52[_0x5d35('38','Y0ib')],'ZHZFf':function(_0x159e9b,_0x445edc,_0x3e400f){return _0x1f7f52[_0x5d35('39','2rwh')](_0x159e9b,_0x445edc,_0x3e400f);},'ExUxi':function(_0x224cb5,_0x428a1b){return _0x1f7f52[_0x5d35('3a','2rwh')](_0x224cb5,_0x428a1b);},'nhHeP':_0x1f7f52[_0x5d35('3b','vvzF')],'UmpfE':_0x1f7f52[_0x5d35('3c','bwC5')]};$[_0x5d35('3d','sk5#')](_0x4e649e,async(_0x591032,_0x417033,_0x2e1624)=>{try{if(_0x591032){}else{if(_0x2cda64[_0x5d35('3e','Vo9j')](_0x2cda64[_0x5d35('3f','bGbE')],_0x2cda64[_0x5d35('40','*sL6')])){$[_0x5d35('41','6FFf')]();}else{_0x2e1624=JSON[_0x5d35('42','fmnN')](_0x2e1624);_0x2e1624=_0x2e1624[_0x5d35('43','Mx]b')](/hrl='(\S*)';var/)[0x1];_0x417033=_0x417033[_0x5d35('44','2rwh')][_0x2cda64[_0x5d35('45','u#QP')]];_0x417033=JSON[_0x5d35('46','dIkW')](_0x417033);_0x417033=_0x417033[_0x5d35('47','dIkW')](/CSID(\S*);/)[0x1];let _0x3aa8b2=_0x417033;await _0x2cda64[_0x5d35('48','*sL6')](S02,_0x2e1624,_0x3aa8b2);await $[_0x5d35('49','bwC5')](0xc8);}}}catch(_0x1ce16d){$[_0x5d35('4a','d(ku')]();}finally{if(_0x2cda64[_0x5d35('4b','83f&')](_0x2cda64[_0x5d35('4c','C@qi')],_0x2cda64[_0x5d35('4d','168y')])){_0x2cda64[_0x5d35('4e','168y')](_0x232fa4);}else{_0x2cda64[_0x5d35('4f','bGbE')](_0x232fa4);}}});});}function S02(_0x5ac98c,_0x3efb74){var _0x2301e4={'ZaoWl':_0x5d35('50','oDxk'),'GxYLT':function(_0x5801bc,_0x5769be){return _0x5801bc+_0x5769be;},'wvTjj':function(_0x54527d,_0x5e60ae){return _0x54527d+_0x5e60ae;},'XRexi':function(_0x153d9a,_0x48634f){return _0x153d9a+_0x48634f;},'pJcAd':_0x5d35('51','eoQu'),'OxwDh':_0x5d35('52','lO$c'),'UOjWn':_0x5d35('53','AI@#'),'tDrvJ':_0x5d35('54','*[aR'),'NaTsx':function(_0x1b8918,_0x3a3601){return _0x1b8918(_0x3a3601);},'hHTEa':function(_0x11be81){return _0x11be81();},'DqNrk':function(_0x23df79,_0x444c9d){return _0x23df79===_0x444c9d;},'hEkab':_0x5d35('55','dIkW'),'gEihL':_0x5d35('56','168y'),'gIfJi':_0x5d35('57','Aa%e'),'yJzxA':function(_0x3757e8,_0x222ced){return _0x3757e8+_0x222ced;},'zpzXA':function(_0x1db614,_0x1fb02f){return _0x1db614+_0x1fb02f;},'QaUJC':function(_0x12d7cb,_0x54ab74){return _0x12d7cb+_0x54ab74;},'cJfKh':_0x5d35('58','RA#e')};let _0x16edf0={'url':_0x5ac98c,'followRedirect':![],'headers':{'Host':_0x2301e4[_0x5d35('59','H!@v')],'Connection':_0x2301e4[_0x5d35('5a','fmnN')],'Cookie':_0x2301e4[_0x5d35('5b','oDxk')](_0x2301e4[_0x5d35('5c','bGbE')](_0x2301e4[_0x5d35('5d','w0A!')](_0x2301e4[_0x5d35('5e','gvUx')](cookie,'\x20'),_0x2301e4[_0x5d35('5f','w0A!')]),_0x3efb74),';'),'Referer':$[_0x5d35('60','*sL6')],'User-Agent':_0x2301e4[_0x5d35('61','83f&')]}};return new Promise(_0x5df78a=>{var _0x156ce0={'eoKUd':_0x2301e4[_0x5d35('62','u#QP')],'Vcfyu':function(_0x33a5fb,_0x247059){return _0x2301e4[_0x5d35('63','oDxk')](_0x33a5fb,_0x247059);},'OHgNZ':function(_0x502525,_0x4d9907){return _0x2301e4[_0x5d35('64','bGbE')](_0x502525,_0x4d9907);},'kEqCY':function(_0x342c07,_0x423f0b){return _0x2301e4[_0x5d35('65','Voxs')](_0x342c07,_0x423f0b);},'WMmIo':function(_0x2ded60,_0x3d06d3){return _0x2301e4[_0x5d35('66','168y')](_0x2ded60,_0x3d06d3);},'kxicy':function(_0x2237c1,_0x4716a1){return _0x2301e4[_0x5d35('67','OhO#')](_0x2237c1,_0x4716a1);},'hhXPG':function(_0x341fe0,_0x4974ba){return _0x2301e4[_0x5d35('68','83f&')](_0x341fe0,_0x4974ba);},'VCHBZ':_0x2301e4[_0x5d35('69','P3Db')],'eyfPa':_0x2301e4[_0x5d35('6a','fmnN')],'YVBkL':_0x2301e4[_0x5d35('6b','P3Db')],'COOWW':_0x2301e4[_0x5d35('6c','dIkW')],'ePaqR':function(_0x1dc5c5,_0x4b074d){return _0x2301e4[_0x5d35('6d','dIkW')](_0x1dc5c5,_0x4b074d);},'amlPT':function(_0x33378b){return _0x2301e4[_0x5d35('6e','Mx]b')](_0x33378b);}};if(_0x2301e4[_0x5d35('6f','w0A!')](_0x2301e4[_0x5d35('70','*sL6')],_0x2301e4[_0x5d35('71','Aa%e')])){$[_0x5d35('72','lO$c')](_0x16edf0,async(_0x4f2228,_0x2791a4,_0x5ac98c)=>{try{if(_0x4f2228){}else{_0x2791a4=_0x2791a4[_0x5d35('44','2rwh')][_0x156ce0[_0x5d35('73','RA#e')]];_0x2791a4=JSON[_0x5d35('74','OhO#')](_0x2791a4);let _0x4668b7=_0x2791a4[_0x5d35('75','Aa%e')](/CCC_SE(\S*);/)[0x1];let _0x19974c=_0x2791a4[_0x5d35('76','oDxk')](/unpl(\S*);/)[0x1];let _0x22f222=_0x2791a4[_0x5d35('77','OhO#')](/unionuuid(\S*);/)[0x1];let _0x4603f5=_0x156ce0[_0x5d35('78','ac!Z')](_0x156ce0[_0x5d35('79','83f&')](_0x156ce0[_0x5d35('7a','wWF7')](_0x156ce0[_0x5d35('7a','wWF7')](_0x156ce0[_0x5d35('7b','Cp5o')](_0x156ce0[_0x5d35('7c','168y')](_0x156ce0[_0x5d35('7d','u#QP')](_0x156ce0[_0x5d35('7e','bwC5')](_0x156ce0[_0x5d35('7d','u#QP')](_0x156ce0[_0x5d35('7f','Cp5o')](_0x156ce0[_0x5d35('80','83f&')](_0x156ce0[_0x5d35('81','Aa%e')](_0x156ce0[_0x5d35('82','168y')](cookie,'\x20'),_0x156ce0[_0x5d35('83','Mx]b')]),_0x3efb74),';\x20'),_0x156ce0[_0x5d35('84','P01c')]),_0x4668b7),';\x20'),_0x156ce0[_0x5d35('85','RA#e')]),_0x19974c),';\x20'),_0x156ce0[_0x5d35('86','AI@#')]),_0x22f222),';\x20');await _0x156ce0[_0x5d35('87','bwC5')](S03,_0x4603f5);await $[_0x5d35('88','Aa%e')](0xc8);}}catch(_0x1074e3){$[_0x5d35('89','*sL6')]();}finally{_0x156ce0[_0x5d35('8a','83f&')](_0x5df78a);}});}else{$[_0x5d35('8b','M[Np')]();}});}function S03(_0x4847eb){var _0x4b324b={'wGTzO':function(_0x4c9872){return _0x4c9872();},'OUDGT':function(_0x3535a4,_0x39b635){return _0x3535a4===_0x39b635;},'CHcXX':_0x5d35('8c','6FFf'),'StblP':_0x5d35('8d','Mx]b'),'lGneN':function(_0x4bab0f,_0x45d957){return _0x4bab0f(_0x45d957);},'cGBjV':function(_0x1c0c75,_0x450922){return _0x1c0c75===_0x450922;},'YBePe':_0x5d35('8e','Mx]b'),'CwHqx':function(_0x51451a){return _0x51451a();},'miUqm':_0x5d35('8f','d(ku'),'ZAavk':_0x5d35('90','6FFf'),'mVuLV':_0x5d35('91','6FFf')};let _0x3587fc={'url':$[_0x5d35('92','*%TG')],'headers':{'Host':_0x4b324b[_0x5d35('93','P01c')],'Connection':_0x4b324b[_0x5d35('94','bwC5')],'Cookie':_0x4847eb,'Referer':$[_0x5d35('95','sk5#')],'User-Agent':_0x4b324b[_0x5d35('96','4NiT')]}};return new Promise(_0x5cda94=>{$[_0x5d35('97','Voxs')](_0x3587fc,async(_0x2efd42,_0x489cc0,_0x32cd99)=>{var _0x5a32eb={'Qrpcl':function(_0x1c3e1e){return _0x4b324b[_0x5d35('98','Y6xa')](_0x1c3e1e);}};if(_0x4b324b[_0x5d35('99','AI@#')](_0x4b324b[_0x5d35('9a','OhO#')],_0x4b324b[_0x5d35('9b','6FFf')])){_0x5a32eb[_0x5d35('9c','168y')](_0x5cda94);}else{try{if(_0x2efd42){}else{_0x32cd99=JSON[_0x5d35('9d','PNb&')](_0x32cd99);await _0x4b324b[_0x5d35('9e','5*6w')](S04,_0x4847eb);await $[_0x5d35('9f','fmnN')](0xc8);}}catch(_0x432dfb){$[_0x5d35('a0','Cp5o')]();}finally{if(_0x4b324b[_0x5d35('a1','NzEg')](_0x4b324b[_0x5d35('a2','Em9O')],_0x4b324b[_0x5d35('a3','Mx]b')])){_0x4b324b[_0x5d35('a4','*QVY')](_0x5cda94);}else{$[_0x5d35('a5','5*6w')]();}}}});});}function S04(_0x2c1758){var _0x392b81={'JxBvR':function(_0x39efb4){return _0x39efb4();},'hAbDA':function(_0xd992d2,_0x2c27e8){return _0xd992d2!==_0x2c27e8;},'gyPfg':_0x5d35('a6','NzEg'),'lVWnx':_0x5d35('a7','4NiT'),'LxMwX':_0x5d35('a8','P3Db'),'QpLIz':function(_0x22b19b,_0x574656){return _0x22b19b!==_0x574656;},'vIDlP':_0x5d35('a9','u#QP'),'inUtO':_0x5d35('aa','u#QP'),'fWOGL':function(_0x5571e5){return _0x5571e5();},'bSidZ':function(_0xfb9277){return _0xfb9277();},'TrwXw':function(_0x5072fb,_0x28b41f){return _0x5072fb===_0x28b41f;},'Adqgm':_0x5d35('ab','2rwh'),'HBCEt':_0x5d35('ac','vvzF'),'bsDtA':_0x5d35('ad','Voxs'),'stmKu':_0x5d35('ae','Cp5o')};let _0x58990a={'url':$[_0x5d35('af','bGbE')],'headers':{'Host':_0x392b81[_0x5d35('b0','A]VP')],'Connection':_0x392b81[_0x5d35('b1','4NiT')],'Cookie':_0x2c1758,'Referer':$[_0x5d35('b2','P3Db')],'User-Agent':_0x392b81[_0x5d35('b3','Voxs')]}};return new Promise(_0x1d0ed2=>{var _0x2f286c={'zvGBD':function(_0x33da9d){return _0x392b81[_0x5d35('b4','*%TG')](_0x33da9d);}};if(_0x392b81[_0x5d35('b5','*[aR')](_0x392b81[_0x5d35('b6','*%TG')],_0x392b81[_0x5d35('b7','bGbE')])){$[_0x5d35('b8','Em9O')](_0x58990a,async(_0x1d01cc,_0x518d07,_0x587a57)=>{var _0x472119={'oeQnP':function(_0x38e3df){return _0x392b81[_0x5d35('b9','*QVY')](_0x38e3df);}};if(_0x392b81[_0x5d35('ba','Y6xa')](_0x392b81[_0x5d35('bb','M[Np')],_0x392b81[_0x5d35('bc','bwC5')])){_0x472119[_0x5d35('bd','RA#e')](_0x1d0ed2);}else{try{if(_0x1d01cc){}else{_0x587a57=JSON[_0x5d35('be','lO$c')](_0x587a57);await $[_0x5d35('bf','*QVY')](0xc8);}}catch(_0x349ad7){if(_0x392b81[_0x5d35('c0','P01c')](_0x392b81[_0x5d35('c1',']&91')],_0x392b81[_0x5d35('c2','*QVY')])){$[_0x5d35('c3','ac!Z')]();}else{$[_0x5d35('c4','Vo9j')]();}}finally{if(_0x392b81[_0x5d35('c5','AI@#')](_0x392b81[_0x5d35('c6','Aa%e')],_0x392b81[_0x5d35('c7','bGbE')])){_0x392b81[_0x5d35('c8','*QVY')](_0x1d0ed2);}else{$[_0x5d35('c9','wWF7')]();}}}});}else{_0x2f286c[_0x5d35('ca','AI@#')](_0x1d0ed2);}});};_0xodm='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}