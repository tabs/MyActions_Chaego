/*
cron "0 0 * * *" jd_club_lottery.js, tag:摇京豆
*/
const $ = new Env('摇京豆');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';

//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', message = '', allMessage = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
let superShakeBeanConfig = {
  "superShakeUlr": "",//超级摇一摇活动链接
  "superShakeBeanFlag": false,
  "superShakeTitle": "",
  "taskVipName": "",
}
$.assigFirends = [];
$.brandActivityId = '';//超级品牌日活动ID
$.brandActivityId2 = '2vSNXCeVuBy8mXTL2hhG3mwSysoL';//超级品牌日活动ID2
const JD_API_HOST = 'https://api.m.jd.com/client.action';
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  await welcomeHome()
  if ($.superShakeUrl) {
    await getActInfo($.superShakeUrl);
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.freeTimes = 0;
      $.prizeBeanCount = 0;
      $.totalBeanCount = 0;
      $.superShakeBeanNum = 0;
      $.moFangBeanNum = 0;
      $.isLogin = true;
      $.nickName = '';
      message = ''
      await TotalBean();
      console.log(`\n********开始【京东账号${$.index}】${$.nickName || $.UserName}*****\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});

        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      await getUA()
      await getinfo()
      await clubLottery();
      await showMsg();
    }
  }
  for (let v = 0; v < cookiesArr.length; v++) {
    cookie = cookiesArr[v];
    $.index = v + 1;
    $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
    $.canHelp = true;
    if ($.canHelp && $.activityId) {
      $.assigFirends = $.assigFirends.concat({
        "encryptAssignmentId": $.assigFirends[0] && $.assigFirends[0]['encryptAssignmentId'],
        "assignmentType": 2,
        "itemId": "SZm_olqSxIOtH97BATGmKoWraLaw",
      })
      for (let item of $.assigFirends || []) {
        if (item['encryptAssignmentId'] && item['assignmentType'] && item['itemId']) {
          console.log(`\n账号 ${$.index} ${$.UserName} 开始给 ${item['itemId']} 进行助力`)
          await superBrandDoTask({
            "activityId": $.activityId,
            "encryptProjectId": $.encryptProjectId,
            "encryptAssignmentId": item['encryptAssignmentId'],
            "assignmentType": item['assignmentType'],
            "itemId": item['itemId'],
            "actionType": 0,
            "source": "main"
          });
          if (!$.canHelp) {
            console.log(`次数已用完，跳出助力`)
            break
          }
        }
      }
      //账号内部助力后，继续抽奖
      for (let i = 0; i < new Array(4).fill('').length; i++) {
        await superBrandTaskLottery();
        await $.wait(400);
      }
    }
  }
  if (allMessage) {
    if ($.isNode()) await notify.sendNotify($.name, allMessage);
  }
  if (superShakeBeanConfig.superShakeUlr) {
    const scaleUl = { "category": "jump", "des": "m", "url": superShakeBeanConfig['superShakeUlr'] };
    const openjd = `openjd://virtual?params=${encodeURIComponent(JSON.stringify(scaleUl))}`;
    $.msg($.name,'', `【${superShakeBeanConfig['superShakeTitle'] || '超级摇一摇'}】活动再次开启\n【${superShakeBeanConfig['taskVipName'] || '开通品牌会员'}】请点击弹窗直达活动页面\n${superShakeBeanConfig['superShakeUlr']}`, { 'open-url': openjd });
    if ($.isNode()) await notify.sendNotify($.name, `【${superShakeBeanConfig['superShakeTitle']}】活动再次开启\n【${superShakeBeanConfig['taskVipName'] || '开通品牌会员'}】请点击链接直达活动页面\n${superShakeBeanConfig['superShakeUlr']}`, { url: openjd });
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })

async function clubLottery() {
  try {
    await doTasks();//做任务
    await getFreeTimes();//获取摇奖次数
    await vvipclub_receive_lottery_times();//京东会员：领取一次免费的机会
    await vvipclub_shaking_info();//京东会员：查询多少次摇奖次数
    await shaking();//开始摇奖
    await shakeSign();//京东会员签到
    await superShakeBean();//京东APP首页超级摇一摇
    await superbrandShakeBean();//京东APP首页超级品牌日
  } catch (e) {
    $.logErr(e)
  }
}
async function doTasks() {
  const browseTaskRes = await getTask('browseTask');
  if (browseTaskRes.success) {
    const { totalPrizeTimes, currentFinishTimes, taskItems } = browseTaskRes.data[0];
    const taskTime = totalPrizeTimes - currentFinishTimes;
    if (taskTime > 0) {
      let taskID = [];
      taskItems.map(item => {
        if (!item.finish) {
          taskID.push(item.id);
        }
      });
      if (taskID.length > 0) console.log(`开始做浏览页面任务`)
      for (let i = 0; i < new Array(taskTime).fill('').length; i++) {
        await $.wait(1000);
        await doTask('browseTask', taskID[i]);
      }
    }
  } else {
    console.log(`${JSON.stringify(browseTaskRes)}`)
  }
  const attentionTaskRes = await getTask('attentionTask');
  if (attentionTaskRes.success) {
    const { totalPrizeTimes, currentFinishTimes, taskItems } = attentionTaskRes.data[0];
    const taskTime = totalPrizeTimes - currentFinishTimes;
    if (taskTime > 0) {
      let taskID = [];
      taskItems.map(item => {
        if (!item.finish) {
          taskID.push(item.id);
        }
      });
      console.log(`开始做关注店铺任务`)
      for (let i = 0; i < new Array(taskTime).fill('').length; i++) {
        await $.wait(1000);
        await doTask('attentionTask', taskID[i].toString());
      }
    }
  }
}
async function shaking() {
  for (let i = 0; i < new Array($.leftShakingTimes).fill('').length; i++) {
    console.log(`开始 【京东会员】 摇奖`)
    await $.wait(1000);
    const newShakeBeanRes = await vvipclub_shaking_lottery();
    if (newShakeBeanRes.success) {
      console.log(`京东会员-剩余摇奖次数：${newShakeBeanRes.data.remainLotteryTimes}`)
      if (newShakeBeanRes.data && newShakeBeanRes.data.rewardBeanAmount) {
        $.prizeBeanCount += newShakeBeanRes.data.rewardBeanAmount;
        console.log(`恭喜你，京东会员中奖了，获得${newShakeBeanRes.data.rewardBeanAmount}京豆\n`)
      } else {
        console.log(`未中奖\n`)
      }
    }
  }
  for (let i = 0; i < new Array($.freeTimes).fill('').length; i++) {
    console.log(`开始 【摇京豆】 摇奖`)
    await $.wait(1000);
    const shakeBeanRes = await shakeBean();
    if (shakeBeanRes.success) {
      console.log(`剩余摇奖次数：${shakeBeanRes.data.luckyBox.freeTimes}`)
      if (shakeBeanRes.data && shakeBeanRes.data.prizeBean) {
        console.log(`恭喜你，中奖了，获得${shakeBeanRes.data.prizeBean.count}京豆\n`)
        $.prizeBeanCount += shakeBeanRes.data.prizeBean.count;
        $.totalBeanCount = shakeBeanRes.data.luckyBox.totalBeanCount;
      } else if (shakeBeanRes.data && shakeBeanRes.data.prizeCoupon) {
        console.log(`获得优惠券：${shakeBeanRes.data.prizeCoupon['limitStr']}\n`)
      } else {
        console.log(`摇奖其他未知结果：${JSON.stringify(shakeBeanRes)}\n`)
      }
    }
  }
  if ($.prizeBeanCount > 0) message += `摇京豆：获得${$.prizeBeanCount}京豆`;
}
function showMsg() {
  return new Promise(resolve => {
    if (message) {
      $.msg(`${$.name}`, `京东账号${$.index} ${$.nickName}`, message);
    }
    resolve();
  })
}
//====================API接口=================
//查询剩余摇奖次数API
function vvipclub_shaking_info() {
  return new Promise(resolve => {
    const options = {
      url: `https://api.m.jd.com/?t=${Date.now()}&appid=sharkBean&functionId=vvipclub_shaking_info`,
      headers: {
        "accept": "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cookie": cookie,
        "origin": "https://skuivip.jd.com",
        "referer": "https://skuivip.jd.com/",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          // console.log(data)
          data = JSON.parse(data);
          if (data.success) {
            $.leftShakingTimes = data.data.leftShakingTimes;//剩余抽奖次数
            console.log(`京东会员——摇奖次数${$.leftShakingTimes}`);
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//京东会员摇奖API
function vvipclub_shaking_lottery() {
  return new Promise(resolve => {
    const options = {
      url: `https://api.m.jd.com/?t=${Date.now()}&appid=sharkBean&functionId=vvipclub_shaking_lottery&body=%7B%7D`,
      headers: {
        "accept": "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cookie": cookie,
        "origin": "https://skuivip.jd.com",
        "referer": "https://skuivip.jd.com/",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          // console.log(data)
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
//领取京东会员本摇一摇一次免费的次数
function vvipclub_receive_lottery_times() {
  return new Promise(resolve => {
    const options = {
      url: `https://api.m.jd.com/?t=${Date.now()}&appid=sharkBean&functionId=vvipclub_receive_lottery_times`,
      headers: {
        "accept": "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cookie": cookie,
        "origin": "https://skuivip.jd.com",
        "referer": "https://skuivip.jd.com/",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          // console.log(data)
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
//查询多少次机会
function getFreeTimes() {
  return new Promise(resolve => {
    $.get(taskUrl('vvipclub_luckyBox', { "info": "freeTimes" }), (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          // console.log(data)
          data = JSON.parse(data);
          if (data.success) {
            $.freeTimes = data.data.freeTimes;
            console.log(`摇京豆——摇奖次数${$.freeTimes}`);
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
function getTask(info) {
  return new Promise(resolve => {
    $.get(taskUrl('vvipclub_lotteryTask', { info, "withItem": true }), (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          // console.log(data)
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
function doTask(taskName, taskItemId) {
  return new Promise(resolve => {
    $.get(taskUrl('vvipclub_doTask', { taskName, taskItemId }), (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          // console.log(data)
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
function shakeBean() {
  return new Promise(resolve => {
    $.get(taskUrl('vvipclub_shaking', { "type": '0' }), (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          // console.log(`摇奖结果:${data}`)
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
//新版超级本摇一摇
async function superShakeBean() {
  await superBrandMainPage();
  if ($.activityId && $.encryptProjectId) {
    await superBrandTaskList();
    await superBrandDoTaskFun();
    await superBrandMainPage();
    await lo();
  }
  if ($.ActInfo) {
    await fc_getHomeData($.ActInfo);//获取任务列表
    await doShakeTask($.ActInfo);//做任务
    await fc_getHomeData($.ActInfo, true);//做完任务后查询多少次摇奖次数
    await superShakeLottery($.ActInfo);//开始摇奖
  } else {
    console.log(`\n\n京东APP首页超级摇一摇：目前暂无活动\n\n`)
  }
}
function welcomeHome() {
  return new Promise(resolve => {
    const data = {
      "homeAreaCode": "",
      "identity": "88732f840b77821b345bf07fd71f609e6ff12f43",
      "fQueryStamp": "",
      "globalUIStyle": "9.0.0",
      "showCate": "1",
      "tSTimes": "",
      "geoLast": "",
      "geo": "",
      "cycFirstTimeStamp": "",
      "displayVersion": "9.0.0",
      "geoReal": "",
      "controlMaterials": "",
      "xviewGuideFloor": "index,category,find,cart,home",
      "fringe": "",
      "receiverGeo": ""
    }
    const options = {
      url: `https://api.m.jd.com/client.action?functionId=welcomeHome`,
      // url: `https://api.m.jd.com/client.action?functionId=welcomeHome&body=${escape(JSON.stringify(data))}&uuid=8888888&client=apple&clientVersion=9.4.1&st=1618538579097&sign=e29d09be25576be52ec22a3bb74d4f86&sv=100`,
      // body: `body=${escape(JSON.stringify(data))}`,
      body: `body=%7B%22homeAreaCode%22%3A%220%22%2C%22identity%22%3A%2288732f840b77821b345bf07fd71f609e6ff12f43%22%2C%22cycNum%22%3A1%2C%22fQueryStamp%22%3A%221619741900009%22%2C%22globalUIStyle%22%3A%229.0.0%22%2C%22showCate%22%3A%221%22%2C%22tSTimes%22%3A%220%22%2C%22geoLast%22%3A%22K3%252BcQaJxm9FzAm8%252BYHBwQKEMnguxItJAtNhFQOgUkktO5Vmidb%252BfKedLYq%252Fjlnc%252BK0ZsoA8jI8yXkYA6M2L5NYrGdBxZPbV%252FzT%252BU%252BHaCeNg%253D%22%2C%22geo%22%3A%22CZQirfKpZqpcvvBN0KadX76P55F3UdFoB2C3P0ZyHOXZWjeifB1aM0xH3BWx0YRlyu4eaUsfA3KpuoAraiffcw%253D%253D%22%2C%22cycFirstTimeStamp%22%3A%221619740961090%22%2C%22displayVersion%22%3A%229.0.0%22%2C%22geoReal%22%3A%22CZQirfKpZqpcvvBN0KadX76P55F3UdFoB2C3P0ZyHOXtnAGs7wzWHMkTSTIEj7qi%22%2C%22controlMaterials%22%3A%22null%22%2C%22xviewGuideFloor%22%3A%22index%2Ccategory%2Cfind%2Ccart%2Chome%22%2C%22fringe%22%3A%221%22%2C%22receiverGeo%22%3A%22mTBeEjk2Q83Kb3%252Fylt2Amm7iguwnhvKDgDnR18TktRpedJcPIHjALOIwGuNKAgau%22%7D&client=apple&clientVersion=9.4.6&d_brand=apple&isBackground=N&joycious=104&lang=zh_CN&networkType=4g&networklibtype=JDNetworkBaseAF&openudid=88732f840b77821b345bf07fd71f609e6ff12f43&osVersion=14.3&partner=apple&rfs=0000&scope=11&screen=828%2A1792&sign=69cc68677ae63b0a8737602766a0a340&st=1619741900013&sv=111&uts=0f31TVRjBSujckcdxhii7gq9cidRV4uxtCNZpaQs9IOuG5PD2oGme36aUnsUBSyCtrnCzcJjRQzsekOXnNu9XyW4W2UAsnnZ06POovikHhGabI9pwW8ZeJ2vmOBTWqWjA66DWDvRHGVeJeXzsm5xolz7r%2FX0APYfhg8I5QBwgKJfD3hzoXkHcnsGfMhHncRzuC4iOtgVG8L%2FnQyyNwXAJQ%3D%3D&uuid=hjudwgohxzVu96krv%2FT6Hg%3D%3D&wifiBssid=unknown`,
      headers: {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-Hans-CN;q=1, zh-Hant-CN;q=0.9",
        "Connection": "keep-alive",
        "Content-Length": "1761",
        "Content-Type": "application/x-www-form-urlencoded",
        "Host": "api.m.jd.com",
        "User-Agent": "JD4iPhone/167588 (iPhone; iOS 14.3; Scale/2.00)"
      }
    }
    $.post(options, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} welcomeHome API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['floorList'] && data['floorList'].length) {
              const shakeFloorNew = data['floorList'].filter(vo => !!vo && vo.type === 'shakeFloorNew')[0];
              const shakeFloorNew2 = data['floorList'].filter(vo => !!vo && vo.type === 'float')[0];
              // console.log('shakeFloorNew2', JSON.stringify(shakeFloorNew2))
              if (shakeFloorNew) {
                const jump = shakeFloorNew['jump'];
                if (jump && jump.params && jump['params']['url']) {
                  $.superShakeUrl = jump.params.url;//有活动链接，但活动可能已过期，需做进一步判断
                  console.log(`【超级摇一摇】活动链接：${jump.params.url}`);
                }
              }
              if (shakeFloorNew2) {
                const jump = shakeFloorNew2['jump'];
                if (jump && jump.params && jump['params']['url'].includes('https://h5.m.jd.com/babelDiy/Zeus/2PTXhrEmiMEL3mD419b8Gn9bUBiJ/index.html')) {
                  console.log(`【超级品牌日】活动链接：${jump.params.url}`);
                  $.superbrandUrl = jump.params.url;
                }
              }
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
//=========老版本超级摇一摇================
function getActInfo(url) {
  return new Promise(resolve => {
    $.get({
      url,
      headers:{
        // 'Cookie': cookie,
        'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
      },
      timeout: 10000
    },async (err,resp,data)=>{
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          data = data && data.match(/window\.__FACTORY__TAOYIYAO__STATIC_DATA__ = (.*)}/)
          if (data) {
            data = JSON.parse(data[1] + '}');
            if (data['pageConfig']) superShakeBeanConfig['superShakeTitle'] = data['pageConfig']['htmlTitle'];
            if (data['taskConfig']) {
              $.ActInfo = data['taskConfig']['taskAppId'];
              console.log(`\n获取【${superShakeBeanConfig['superShakeTitle']}】活动ID成功：${$.ActInfo}\n`);
            }
          }
        }
      } catch (e) {
        console.log(e)
      }
      finally {
        resolve()
      }
    })
  })
}
function fc_getHomeData(appId, flag = false) {
  return new Promise(resolve => {
    const body = { appId }
    const options = taskPostUrl('fc_getHomeData', body)
    $.taskVos = [];
    $.lotteryNum = 0;
    $.post(options, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} fc_getHomeData API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['code'] === 0) {
              if (data['data']['bizCode'] === 0) {
                const taskVos = data['data']['result']['taskVos'] || [];
                if (flag && $.index === 1) {
                  superShakeBeanConfig['superShakeBeanFlag'] = true;
                  superShakeBeanConfig['taskVipName'] = taskVos.filter(vo => !!vo && vo['taskType'] === 21)[0]['taskName'];
                }
                superShakeBeanConfig['superShakeUlr'] = $.superShakeUrl;
                $.taskVos = taskVos.filter(item => !!item && item['status'] === 1) || [];
                $.lotteryNum = parseInt(data['data']['result']['lotteryNum']);
                $.lotTaskId = parseInt(data['data']['result']['lotTaskId']);
              } else if (data['data']['bizCode'] === 101) {
                console.log(`京东APP首页超级摇一摇： ${data['data']['bizMsg']}`);
              }
            } else {
              console.log(`获取超级摇一摇任务数据异常： ${JSON.stringify(data)}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
async function doShakeTask(appId) {
  for (let vo of $.taskVos) {
    if (vo['taskType'] === 21) {
      console.log(`超级摇一摇 ${vo['taskName']} 跳过`);
      continue
    }
    if (vo['taskType'] === 9) {
      console.log(`开始做 ${vo['taskName']}，等10秒`);
      const shoppingActivityVos = vo['shoppingActivityVos'];
      for (let task of shoppingActivityVos) {
        await fc_collectScore({
          appId,
          "taskToken": task['taskToken'],
          "taskId": vo['taskId'],
          "itemId": task['itemId'],
          "actionType": 1
        })
        await $.wait(10000)
        await fc_collectScore({
          appId,
          "taskToken": task['taskToken'],
          "taskId": vo['taskId'],
          "itemId": task['itemId'],
          "actionType": 0
        })
      }
    }
    if (vo['taskType'] === 1) {
      console.log(`开始做 ${vo['taskName']}， 等8秒`);
      const followShopVo = vo['followShopVo'];
      for (let task of followShopVo) {
        await fc_collectScore({
          appId,
          "taskToken": task['taskToken'],
          "taskId": vo['taskId'],
          "itemId": task['itemId'],
          "actionType": 1
        })
        await $.wait(9000)
        await fc_collectScore({
          appId,
          "taskToken": task['taskToken'],
          "taskId": vo['taskId'],
          "itemId": task['itemId'],
          "actionType": 0
        })
      }
    }
  }
}
function fc_collectScore(body) {
  return new Promise(resolve => {
    const options = taskPostUrl('fc_collectScore', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} fc_collectScore API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            console.log(`${JSON.stringify(data)}`)
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
async function superShakeLottery(appId) {
  if ($.lotteryNum) console.log(`\n\n开始京东APP首页超级摇一摇 摇奖`);
  for (let i = 0; i < new Array($.lotteryNum).fill('').length; i++) {
    await fc_getLottery(appId);//抽奖
    await $.wait(1000)
  }
  if ($.superShakeBeanNum > 0) {
    message += `${message ? '\n' : ''}${superShakeBeanConfig['superShakeTitle']}：获得${$.superShakeBeanNum}京豆`
    allMessage += `京东账号${$.index}${$.nickName || $.UserName}\n${superShakeBeanConfig['superShakeTitle']}：获得${$.superShakeBeanNum}京豆${$.index !== cookiesArr.length ? '\n\n' : ''}`;
  }
}
function fc_getLottery(appId) {
  return new Promise(resolve => {
    const body = {appId, "taskId": $.lotTaskId}
    const options = taskPostUrl('fc_getLotteryResult', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} fc_collectScore API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data && data['data']['bizCode'] === 0) {
              $.myAwardVo = data['data']['result']['myAwardVo'];
              if ($.myAwardVo) {
                console.log(`超级摇一摇 抽奖结果:${JSON.stringify($.myAwardVo)}`)
                if ($.myAwardVo['type'] === 2) {
                  $.superShakeBeanNum = $.superShakeBeanNum + parseInt($.myAwardVo['jBeanAwardVo']['quantity']);
                }
              }
            } else {
              console.log(`超级摇一摇 抽奖异常： ${JSON.stringify(data)}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
//===================新版超级本摇一摇==============
function superBrandMainPage() {
  return new Promise(resolve => {
    const body = {"source":"main"};
    const options = superShakePostUrl('superBrandMainPage', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superBrandTaskList API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['code'] === '0') {
              if (data['data']['bizCode'] === '0') {
                //superShakeBeanConfig['superShakeUlr'] = jump.params.url;
                //console.log(`【超级摇一摇】活动链接：${superShakeBeanConfig['superShakeUlr']}`);
                superShakeBeanConfig['superShakeUlr'] = $.superShakeUrl;
                $.activityId = data['data']['result']['activityBaseInfo']['activityId'];
                $.encryptProjectId = data['data']['result']['activityBaseInfo']['encryptProjectId'];
                $.activityName = data['data']['result']['activityBaseInfo']['activityName'];
                $.userStarNum = Number(data['data']['result']['activityUserInfo']['userStarNum']) || 0;
                superShakeBeanConfig['superShakeTitle'] = $.activityName;
                console.log(`${$.activityName} 当前共有积分：${$.userStarNum}，可抽奖：${parseInt($.userStarNum / 100)}次(最多4次摇奖机会)\n`);
              } else {
                console.log(`\n【新版本 超级摇一摇】获取信息失败：${data['data']['bizMsg']}\n`);
              }
            } else {
              console.log(`获取超级摇一摇信息异常：${JSON.stringify(data)}\n`);
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
function superBrandTaskList() {
  return new Promise(resolve => {
    $.taskList = [];
    const body = {"activityId": $.activityId, "assistInfoFlag": 4, "source": "main"};
    const options = superShakePostUrl('superBrandTaskList', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superBrandTaskList API请求失败，请检查网路重试`)
        } else {
          if (data) {
            // console.log(data);
            data = JSON.parse(data);
            if (data['code'] === '0' && data['data']['bizCode'] === '0') {
              $.taskList = data['data']['result']['taskList'];
              $.canLottery = $.taskList.filter(vo => !!vo && vo['assignmentTimesLimit'] === 4)[0]['completionFlag']
            } else {
              console.log(`获取超级摇一摇任务异常：${JSON.stringify(data)}`);
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
async function superBrandDoTaskFun() {
  $.taskList = $.taskList.filter(vo => !!vo && !vo['completionFlag'] && (vo['assignmentType'] !== 6 && vo['assignmentType'] !== 7 && vo['assignmentType'] !== 0 && vo['assignmentType'] !== 30));
  for (let item of $.taskList) {
    if (item['assignmentType'] === 1) {
      const { ext } = item;
      console.log(`开始做 ${item['assignmentName']}，需等待${ext['waitDuration']}秒`);
      const shoppingActivity = ext['shoppingActivity'];
      for (let task of shoppingActivity) {
        await superBrandDoTask({
          "activityId": $.activityId,
          "encryptProjectId": $.encryptProjectId,
          "encryptAssignmentId": item['encryptAssignmentId'],
          "assignmentType": item['assignmentType'],
          "itemId": task['itemId'],
          "actionType": 1,
          "source": "main"
        })
        await $.wait(1000 * ext['waitDuration'])
        await superBrandDoTask({
          "activityId": $.activityId,
          "encryptProjectId": $.encryptProjectId,
          "encryptAssignmentId": item['encryptAssignmentId'],
          "assignmentType": item['assignmentType'],
          "itemId": task['itemId'],
          "actionType": 0,
          "source": "main"
        })
      }
    }
    if (item['assignmentType'] === 3) {
      const { ext } = item;
      console.log(`开始做 ${item['assignmentName']}`);
      const followShop = ext['followShop'];
      for (let task of followShop) {
        await superBrandDoTask({
          "activityId": $.activityId,
          "encryptProjectId": $.encryptProjectId,
          "encryptAssignmentId": item['encryptAssignmentId'],
          "assignmentType": item['assignmentType'],
          "itemId": task['itemId'],
          "actionType": 0,
          "source": "main"
        })
      }
    }
    if (item['assignmentType'] === 2) {
      const { ext } = item;
      const assistTaskDetail = ext['assistTaskDetail'];
      console.log(`${item['assignmentName']}好友邀请码： ${assistTaskDetail['itemId']}`)
      if (assistTaskDetail['itemId']) $.assigFirends.push({
        itemId: assistTaskDetail['itemId'],
        encryptAssignmentId: item['encryptAssignmentId'],
        assignmentType: item['assignmentType'],
      });
    }
  }
}
function superBrandDoTask(body) {
  return new Promise(resolve => {
    const options = superShakePostUrl('superBrandDoTask', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superBrandTaskList API请求失败，请检查网路重试`)
        } else {
          if (data) {
            if (body['assignmentType'] === 2) {
              console.log(`助力好友 ${body['itemId']}结果 ${data}`);
            } else {
              console.log('做任务结果', data);
            }
            data = JSON.parse(data);
            if (data && data['code'] === '0' && data['data']['bizCode'] === '108') {
              $.canHelp = false;
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
async function lo() {
  const num = parseInt(($.userStarNum || 0) / 100);
  if (!$.canLottery) {
    for (let i = 0; i < new Array(num).fill('').length; i++) {
      await $.wait(1000);
      await superBrandTaskLottery();
    }
  }
  if ($.superShakeBeanNum > 0) {
    message += `${message ? '\n' : ''}${$.activityName || '超级摇一摇'}：获得${$.superShakeBeanNum}京豆\n`;
    allMessage += `京东账号${$.index}${$.nickName || $.UserName}\n${superShakeBeanConfig['superShakeTitle']}：获得${$.superShakeBeanNum}京豆${$.index !== cookiesArr.length ? '\n\n' : ''}`;
  }
}
function superBrandTaskLottery() {
  return new Promise(resolve => {
    const body = { "activityId": $.activityId, "source": "main" }
    const options = superShakePostUrl('superBrandTaskLottery', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superBrandDoTaskLottery API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data && data['code'] === '0') {
              if (data['data']['bizCode'] === "TK000") {
                $.rewardComponent = data['data']['result']['rewardComponent'];
                if ($.rewardComponent) {
                  console.log(`超级摇一摇 抽奖结果:${JSON.stringify($.rewardComponent)}`)
                  if ($.rewardComponent.beanList && $.rewardComponent.beanList.length) {
                    console.log(`获得${$.rewardComponent.beanList[0]['quantity']}京豆`)
                    $.superShakeBeanNum += parseInt($.rewardComponent.beanList[0]['quantity']);
                  }
                }
              } else if (data['data']['bizCode'] === "TK1703") {
                console.log(`超级摇一摇 抽奖失败：${data['data']['bizMsg']}`);
              } else {
                console.log(`超级摇一摇 抽奖失败：${data['data']['bizMsg']}`);
              }
            } else {
              console.log(`超级摇一摇 抽奖异常： ${JSON.stringify(data)}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
//============超级品牌日==============
async function superbrandShakeBean() {
  $.bradCanLottery = true;//是否有超级品牌日活动
  $.bradHasLottery = false;//是否已抽奖
  await qryCompositeMaterials("advertGroup", "04405074", "Brands");//获取品牌活动ID
  await superbrand_getHomeData();
  if (!$.bradCanLottery) {
    console.log(`【${$.stageName} 超级品牌日】：活动不在进行中`)
    return
  }
  if ($.bradHasLottery) {
    console.log(`【${$.stageName} 超级品牌日】：已完成抽奖`)
    return
  }
  await superbrand_getMaterial();//获取完成任务所需的一些ID
  await qryCompositeMaterials();//做任务
  await superbrand_getGift();//抽奖
}
function superbrand_getMaterial() {
  return new Promise(resolve => {
    const body = {"brandActivityId":$.brandActivityId}
    const options = superShakePostUrl('superbrand_getMaterial', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superbrand_getMaterial API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data)
            if (data['code'] === 0) {
              if (data['data']['bizCode'] === 0) {
                const { result } = data['data'];
                $.cmsTaskShopId = result['cmsTaskShopId'];
                $.cmsTaskLink = result['cmsTaskLink'];
                $.cmsTaskGroupId =  result['cmsTaskGroupId'];
                console.log(`【cmsTaskGroupId】：${result['cmsTaskGroupId']}`)
              } else {
                console.log(`超级超级品牌日 ${data['data']['bizMsg']}`)
              }
            } else {
              console.log(`超级超级品牌日 异常： ${JSON.stringify(data)}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
function qryCompositeMaterials(type = "productGroup", id = $.cmsTaskGroupId, mapTo = "Tasks0") {
  return new Promise(resolve => {
    const t1 = {type, id, mapTo}
    const qryParam = JSON.stringify([t1]);
    const body = {
      qryParam,
      "activityId": $.brandActivityId2,
      "pageId": "1411763",
      "reqSrc": "jmfe",
      "geo": {"lng": "", "lat": ""}
    }
    const options = taskPostUrl('qryCompositeMaterials', body)
    $.post(options, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} qryCompositeMaterials API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['code'] === '0') {
              if (mapTo === 'Brands') {
                $.stageName = data.data.Brands.stageName;
                console.log(`\n\n【${$.stageName} brandActivityId】：${data.data.Brands.list[0].extension.copy1}`)
                $.brandActivityId = data.data.Brands.list[0].extension.copy1 || $.brandActivityId;
              } else {
                const { list } = data['data']['Tasks0'];
                console.log(`超级品牌日，做关注店铺 任务`)
                let body = {"brandActivityId": $.brandActivityId, "taskType": "1", "taskId": $.cmsTaskShopId}
                await superbrand_doMyTask(body);
                console.log(`超级品牌日，逛品牌会场 任务`)
                body = {"brandActivityId": $.brandActivityId, "taskType": "2", "taskId": $.cmsTaskLink}
                await superbrand_doMyTask(body);
                console.log(`超级品牌日，浏览下方指定商品 任务`)
                for (let item of list.slice(0, 3)) {
                  body = {"brandActivityId": $.brandActivityId, "taskType": "3", "taskId": item['skuId']};
                  await superbrand_doMyTask(body);
                }
              }
            } else {
              console.log(`qryCompositeMaterials异常： ${JSON.stringify(data)}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
//做任务API
function superbrand_doMyTask(body) {
  return new Promise(resolve => {
    const options = superShakePostUrl('superbrand_doMyTask', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superbrand_doMyTask API请求失败，请检查网路重试`)
        } else {
          if (data) {
            // data = JSON.parse(data)
            console.log(`超级品牌日活动做任务结果：${data}\n`)
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
function superbrand_getGift() {
  return new Promise(resolve => {
    const body = {"brandActivityId":$.brandActivityId}
    const options = superShakePostUrl('superbrand_getGift', body)
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superbrand_getGift API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data)
            if (data['code'] === 0) {
              if (data['data']['bizCode'] === 0) {
                const { result } = data['data'];
                $.jpeasList = result['jpeasList'];
                if ($.jpeasList && $.jpeasList.length) {
                  for (let item of $.jpeasList) {
                    console.log(`超级品牌日 抽奖 获得：${item['quantity']}京豆🐶`);
                    message += `【超级品牌日】获得：${item['quantity']}京豆🐶\n`;
                    if ($.superShakeBeanNum === 0) {
                      allMessage += `京东账号${$.index}${$.nickName || $.UserName}\n【超级品牌日】获得：${item['quantity']}京豆🐶\n`;
                    } else {
                      allMessage += `【超级品牌日】获得：${item['quantity']}京豆🐶\n`;
                    }
                  }
                }
              } else {
                console.log(`超级超级品牌日 抽奖失败： ${data['data']['bizMsg']}`)
              }
            } else {
              console.log(`超级超级品牌日 抽奖 异常： ${JSON.stringify(data)}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
function superbrand_getHomeData() {
  return new Promise(resolve => {
    const body = {"brandActivityIds": $.brandActivityId}
    const options = superShakePostUrl('superbrand_getHomeData', body)
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} superbrand_getHomeData API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data)
            if (data['code'] === 0) {
              if (data['data']['bizCode'] === 0) {
                const { result } = data['data'];
                if (result && result.length) {
                  if (result[0]['activityStatus'] === "2" && result[0]['taskVos'].length) $.bradHasLottery = true;
                }
              } else {
                console.log(`超级超级品牌日 getHomeData 失败： ${data['data']['bizMsg']}`)
                if (data['data']['bizCode'] === 101) {
                  $.bradCanLottery = false;
                }
              }
            } else {
              console.log(`超级超级品牌日 getHomeData 异常： ${JSON.stringify(data)}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
//=======================京东会员签到========================
async function shakeSign() {
  await pg_channel_page_data();
  if ($.token && $.currSignCursor && $.signStatus === -1) {
    const body = {"floorToken": $.token, "dataSourceCode": "signIn", "argMap": { "currSignCursor": $.currSignCursor }};
    const signRes = await pg_interact_interface_invoke(body);
    console.log(`京东会员第${$.currSignCursor}天签到结果；${JSON.stringify(signRes)}`)
    let beanNum = 0;
    if (signRes.success && signRes['data']) {
      console.log(`京东会员第${$.currSignCursor}天签到成功。获得${signRes['data']['rewardVos'] && signRes['data']['rewardVos'][0]['jingBeanVo'] && signRes['data']['rewardVos'][0]['jingBeanVo']['beanNum']}京豆\n`)
      beanNum = signRes['data']['rewardVos'] && signRes['data']['rewardVos'][0]['jingBeanVo'] && signRes['data']['rewardVos'][0]['jingBeanVo']['beanNum']
    }
    if (beanNum) {
      message += `\n京东会员签到：获得${beanNum}京豆\n`;
    }
  } else {
    console.log(`京东会员第${$.currSignCursor}天已签到`)
  }
}
function pg_channel_page_data() {
  const body = {
    "paramData":{"token":"dd2fb032-9fa3-493b-8cd0-0d57cd51812d"}
  }
  return new Promise(resolve => {
    const options = {
      url: `https://api.m.jd.com/?t=${Date.now()}&appid=sharkBean&functionId=pg_channel_page_data&body=${escape(JSON.stringify(body))}`,
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Host": "api.m.jd.com",
        "Cookie": cookie,
        "Origin": "https://spa.jd.com",
        "Referer": "https://spa.jd.com/home",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          data = JSON.parse(data);
          if (data.success) {
            const SIGN_ACT_INFO = data['data']['floorInfoList'].filter(vo => !!vo && vo['code'] === 'SIGN_ACT_INFO')[0]
            $.token = SIGN_ACT_INFO['token'];
            if (SIGN_ACT_INFO['floorData']) {
              $.currSignCursor = SIGN_ACT_INFO['floorData']['signActInfo']['currSignCursor'];
              $.signStatus = SIGN_ACT_INFO['floorData']['signActInfo']['signActCycles'].filter(item => !!item && item['signCursor'] === $.currSignCursor)[0]['signStatus'];
            }
            // console.log($.token, $.currSignCursor, $.signStatus)
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data || {});
      }
    })
  })
}
function pg_interact_interface_invoke(body) {
  return new Promise(resolve => {
    const options = {
      url: `https://api.m.jd.com/?appid=sharkBean&functionId=pg_interact_interface_invoke&body=${escape(JSON.stringify(body))}`,
      headers: {
        'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        "Cookie": cookie,
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Content-Length": "0",
        "Host": "api.m.jd.com",
        "Origin": "https://spa.jd.com",
        "Referer": "https://spa.jd.com/home"
      }
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
          $.logErr(err);
        } else {
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data || {});
      }
    })
  })
}


function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
      headers: {
        Host: "me-api.jd.com",
        Accept: "*/*",
        Connection: "keep-alive",
        Cookie: cookie,
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        "Accept-Language": "zh-cn",
        "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
        "Accept-Encoding": "gzip, deflate, br"
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === "1001") {
              $.isLogin = false; //cookie过期
              return;
            }
            if (data['retcode'] === "0" && data.data && data.data.hasOwnProperty("userInfo")) {
              $.nickName = data.data.userInfo.baseInfo.nickname;
            }
          } else {
            $.log('京东服务器返回空数据');
          }
        }
      } catch (e) {
        $.logErr(e)
      } finally {
        resolve();
      }
    })
  })
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
  $.UA = `jdpingou;iPhone;5.8.0;14.5.1;${randomString(40)};network/wifi;model/iPhone13,2;appBuild/100736;ADID/;supportApplePay/1;hasUPPay/0;pushNoticeIsOpen/0;hasOCPay/0;supportBestPay/0;session/820;pap/JA2019_3111789;brand/apple;supportJDSHWK/1;Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148`
}
function randomString(e) {
  e = e || 32;
  let t = "abcdef0123456789", a = t.length, n = "";
  for (i = 0; i < e; i++)
    n += t.charAt(Math.floor(Math.random() * a));
  return n
}
function taskUrl(function_id, body = {}, appId = 'vip_h5') {
  return {
    url: `${JD_API_HOST}?functionId=${function_id}&appid=${appId}&body=${escape(JSON.stringify(body))}&_=${Date.now()}`,
    headers: {
      'Cookie': cookie,
      'Host': 'api.m.jd.com',
      'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
      'Referer': 'https://vip.m.jd.com/newPage/reward/123dd/slideContent?page=focus',
    }
  }
}
function taskPostUrl(function_id, body) {
  return {
    url: `https://api.m.jd.com/client.action?functionId=${function_id}&body=${escape(JSON.stringify(body))}&client=wh5&clientVersion=1.0.0`,
    headers: {
      'Cookie': cookie,
      'Host': 'api.m.jd.com',
      'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
      'Referer': 'https://h5.m.jd.com/babelDiy/Zeus/4SXuJSqKganGpDSEMEkJWyBrBHcM/index.html',
    }
  }
}
function superShakePostUrl(function_id, body) {
  return {
    url: `https://api.m.jd.com/client.action?functionId=${function_id}&appid=content_ecology&body=${escape(JSON.stringify(body))}&client=wh5&clientVersion=9.3.0&uuid=8888888&t=${Date.now()}`,
    headers: {
      'Cookie': cookie,
      'Host': 'api.m.jd.com',
      'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
      'Referer': 'https://h5.m.jd.com/babelDiy/Zeus/4SXuJSqKganGpDSEMEkJWyBrBHcM/index.html',
    }
  }
}
var _0xodA='jsjiami.com.v6',_0x3cda=[_0xodA,'wpjDvCo6w7w=','P1zDrcKnw58=','w4EOTsOgwrY=','EMOHMyRo','w6LDssK0woNvEQ==','JcOMPSdk','NGgUw6hWIQ==','w5QcVsOcwoU=','ZMKydMKABXnDl8OHU8K6','J8OcUQ8=','w43DnsKQwplOJg==','UAVETA==','w694LyHDhSUBMyA=','w6XDu8KgwohT','w5MSw5Zkw6I=','DxozDcOw','VMOQw5spwro=','w5zDizMhZMKuFsOs','M2IWw50JMljDmsOhWg==','wrXCtD/Ctzk=','SwVaZ8Oy','HmEFw75F','NMK4FsKQJA==','OcKmwrXCizI=','TkxZwrFG','MBbDtsOqwpw=','w77CvEk=','b8KXDWRw','ZsObwrvDjcKq','DcOObxNl','RsOhw7gHwps=','wql+wqvClHk=','ZsOxN8KNDQ==','KMKPNcKcMA==','WUV1wpB7','NMOqwrPDvcOLMcKl','S8OxwqrDs8Ki','wotoM8KoQz3DvxrDgg==','wpLDizw3w7c=','w6PCoMKcAsKQ','eydgUcOJ','worCg8KtLsKp','wr0sVHzDtQ==','eW3CqGvChg==','P8KuwpfChjE=','w6wgw71Sw7c=','w5Q4f8Kxw6U=','EsKTJsKtJA==','w77DuMKZwoFb','Sm/CgXnCmA==','wqpmw64dw68=','wpxqwqfCr1k=','w6/ChiYRBg==','EsOZwpfDrR8=','wrhJw5bDjMKH','wqlLNMKZYw==','wrQRISom','w5A6XsK4w5M=','cMONw6EswoM=','VcOzwpXDkw==','wqtew6guw7I=','w53ChcKrKsKP','w7LCoXIXWQ==','RA91w63CpcKv','OhXDqMORwqw=','w77ClV0Lag==','DMO2woDDrMOD','w5xsIA/Dug==','A8KGBcOED8Kew4xTw7EyXnw=','w6cKWsOIw5kjXQchVw==','LmLDo8Od','ABRyw58C','bcOhG8KuFA==','F8KEAMK4Bw==','NMOCOCJP','UMOGRsO6Fg==','JMO+wovDi8Oo','w7gnXMOLwrU=','ZMONAcK4DQ==','wrtKw5nDvMKJ','wrlJw4w=','w6MKfMKYw4U=','MlAyw4Jo','CMKNwojCnRE=','KwNyw4cm','w4rCp8Khw7bDnw==','woLCiMKBCcKE','TWvCoko=','wrJDw5/DqMK3Eg==','RCpKw6HCnQ==','w6zChjlRBMK/wqfCssOvwp3DsMOy','wo7CgMKNG8OGwppAw7fDsGs=','JMOWNUE=','bMOWw7cuwpk=','wqkFwr9Iw7s=','w6HCkcKSwqbDgg==','wo/DsUAfEQ==','S8OtGg==','wp92w503w5M=','w6oNXcKXw6Z6','U3pjwpZi','w7VcMSPDhw==','HMKuwonCpBA=','w7jCpcK5MMKK','b8OsI8K8Lw==','JsKrNMORU2rCi8OQCsKjw64=','e8KLFHZm','w6RYX8KCwpEUw7QgwozDhRXDpRs5RMKKwrjDulZ2wqnCusODwoXCqMOCVW9iw5F2ZCTDi8KEcklzw4jDpWbDrjEjG8Khw7xPI03DlMOOP8ODwoJ7w4LCuXLDl8OWAMKkw6/CgDI7wogmw6nDtR3CgsKPw71jw4JUNn4yAR1cw5bDq8O/w7LCjsKaS8ODw4bDpQdCfXA7wqJhITABwpHDimzCh8OvAcKdw4PCo8KwVcOEwr7Dl8OTwrTCh8O/LmHCkWwcZsKbUlwhXEvCg8KjDWvCsMKsw4tvPwtVwpMRw7AjUcOPw5h9elnDsA==','w6rCkyQ=','Y8KOGG5RVMKCJ3jCnMK8w5fCnMKANcKpW8O2wpQfw4kewoJ/wqEWwoFzWW0NwoFXBsK0w6pMw4fDnG5gZGzDssO1VEBGZTnCgMOjwq3Dj2lMw4fCgQl2TcKEw6IMDV4Dwpk/woIKRsOIwpTDg3pxVjs=','X8Osw7Y6wrg=','A8KDwpzCpwY=','VGzCvlvCuw==','esKyY8OUJA==','e8KbHm1H','dGtewqxC','wr8Uwpg+','w5PCtUsGVcOn','wrs8woBZw44=','LmLDo8Oe','TsO3wpLDgMKaPw==','aVp5wqxk','BcOrwqDDrcOf','wqfCmijCvg4=','LVjDt8KZw7E=','w6fCk8KSwp3Dkw==','GTkkLcON','ZAdY','w5XCj8KS','QsOBw7Ip','w7MQVsKAw7E=','w69kKn8=','worDmCRl','wpDCl8KEWQ==','IwHDtMK5','eilzd8OTw5Y=','w7zCrCQpPQ==','woddw5TDqcKJ','wprCqiXCuxc=','wpRzJsKEXyg=','PcOLPjZxwpg=','w5nCnRYSOw==','w7jCjMKZwrHDlcKU','HsKDwqvCuCA=','TsKwGnNo','w77CkyRSCsO+wqLCvcKowps=','w797w5gVw78=','WMOFw7UewoA=','fgFNRcO0','wqdke13CmcOVwrdp','fSNxQsKMw4UMLU7DiQ==','wpAMOw==','wrfDiwABw7U=','w6tSw4Qvw4M=','D8OcwoLDocOv','wrVaN8KleQ==','wqjCo8KeD8K/','w5hGw708w6w=','w5jCtVE=','wohJA8K+Vw==','RRVESsOg','wrhTw6Aiw58=','wpUlBQ8T','wozDnjo9w7FkQQ0x','wq7Cuj3CnDM=','OcOBOBdmwpjDmw==','dcOjw4A2wrs=','PRhlw74dw5RuwoZx','SApAQ8OW','w7A6TsKBw5o=','w7sOVsOM','jBsujiaImi.coZCAumnLRyQ.PbWv6=='];(function(_0x3d3234,_0x3c9e22,_0x20e2a2){var _0x2c76cf=function(_0xb1ed74,_0x48d85e,_0x475f59,_0x7a05ea,_0x197cee){_0x48d85e=_0x48d85e>>0x8,_0x197cee='po';var _0x1ad74a='shift',_0x2517ed='push';if(_0x48d85e<_0xb1ed74){while(--_0xb1ed74){_0x7a05ea=_0x3d3234[_0x1ad74a]();if(_0x48d85e===_0xb1ed74){_0x48d85e=_0x7a05ea;_0x475f59=_0x3d3234[_0x197cee+'p']();}else if(_0x48d85e&&_0x475f59['replace'](/[BuIZCAunLRyQPbW=]/g,'')===_0x48d85e){_0x3d3234[_0x2517ed](_0x7a05ea);}}_0x3d3234[_0x2517ed](_0x3d3234[_0x1ad74a]());}return 0xb3848;};var _0x3fabab=function(){var _0x5b3314={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x32a7ab,_0x401253,_0x56672f,_0x10254e){_0x10254e=_0x10254e||{};var _0x402425=_0x401253+'='+_0x56672f;var _0x3beaaf=0x0;for(var _0x3beaaf=0x0,_0x3c6ddd=_0x32a7ab['length'];_0x3beaaf<_0x3c6ddd;_0x3beaaf++){var _0xe463e1=_0x32a7ab[_0x3beaaf];_0x402425+=';\x20'+_0xe463e1;var _0x5b6000=_0x32a7ab[_0xe463e1];_0x32a7ab['push'](_0x5b6000);_0x3c6ddd=_0x32a7ab['length'];if(_0x5b6000!==!![]){_0x402425+='='+_0x5b6000;}}_0x10254e['cookie']=_0x402425;},'removeCookie':function(){return'dev';},'getCookie':function(_0x18373a,_0x3e7119){_0x18373a=_0x18373a||function(_0x116394){return _0x116394;};var _0xe36555=_0x18373a(new RegExp('(?:^|;\x20)'+_0x3e7119['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x1b548a=typeof _0xodA=='undefined'?'undefined':_0xodA,_0xc54560=_0x1b548a['split'](''),_0x42014d=_0xc54560['length'],_0x1c8f2e=_0x42014d-0xe,_0x533389;while(_0x533389=_0xc54560['pop']()){_0x42014d&&(_0x1c8f2e+=_0x533389['charCodeAt']());}var _0x116248=function(_0x4d6140,_0x54984a,_0x349978){_0x4d6140(++_0x54984a,_0x349978);};_0x1c8f2e^-_0x42014d===-0x524&&(_0x533389=_0x1c8f2e)&&_0x116248(_0x2c76cf,_0x3c9e22,_0x20e2a2);return _0x533389>>0x2===0x14b&&_0xe36555?decodeURIComponent(_0xe36555[0x1]):undefined;}};var _0x1d1ef5=function(){var _0x597a83=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x597a83['test'](_0x5b3314['removeCookie']['toString']());};_0x5b3314['updateCookie']=_0x1d1ef5;var _0x549c25='';var _0x8b89f0=_0x5b3314['updateCookie']();if(!_0x8b89f0){_0x5b3314['setCookie'](['*'],'counter',0x1);}else if(_0x8b89f0){_0x549c25=_0x5b3314['getCookie'](null,'counter');}else{_0x5b3314['removeCookie']();}};_0x3fabab();}(_0x3cda,0x65,0x6500));var _0x39fe=function(_0x2a122e,_0x4fa034){_0x2a122e=~~'0x'['concat'](_0x2a122e);var _0x5a7dce=_0x3cda[_0x2a122e];if(_0x39fe['otlzIN']===undefined){(function(){var _0x54b753=function(){var _0x28e790;try{_0x28e790=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(_0x1fd9c9){_0x28e790=window;}return _0x28e790;};var _0x52d47b=_0x54b753();var _0x26a0fa='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x52d47b['atob']||(_0x52d47b['atob']=function(_0x56ccb5){var _0x35d1f1=String(_0x56ccb5)['replace'](/=+$/,'');for(var _0x4a7679=0x0,_0x3dd494,_0x43ba16,_0xdf97e6=0x0,_0x22370c='';_0x43ba16=_0x35d1f1['charAt'](_0xdf97e6++);~_0x43ba16&&(_0x3dd494=_0x4a7679%0x4?_0x3dd494*0x40+_0x43ba16:_0x43ba16,_0x4a7679++%0x4)?_0x22370c+=String['fromCharCode'](0xff&_0x3dd494>>(-0x2*_0x4a7679&0x6)):0x0){_0x43ba16=_0x26a0fa['indexOf'](_0x43ba16);}return _0x22370c;});}());var _0x17b50c=function(_0x3bd0c3,_0x4fa034){var _0x17582d=[],_0x29c5a4=0x0,_0x56dae4,_0x4ac21f='',_0x2f0294='';_0x3bd0c3=atob(_0x3bd0c3);for(var _0x23e680=0x0,_0x31be1b=_0x3bd0c3['length'];_0x23e680<_0x31be1b;_0x23e680++){_0x2f0294+='%'+('00'+_0x3bd0c3['charCodeAt'](_0x23e680)['toString'](0x10))['slice'](-0x2);}_0x3bd0c3=decodeURIComponent(_0x2f0294);for(var _0x480863=0x0;_0x480863<0x100;_0x480863++){_0x17582d[_0x480863]=_0x480863;}for(_0x480863=0x0;_0x480863<0x100;_0x480863++){_0x29c5a4=(_0x29c5a4+_0x17582d[_0x480863]+_0x4fa034['charCodeAt'](_0x480863%_0x4fa034['length']))%0x100;_0x56dae4=_0x17582d[_0x480863];_0x17582d[_0x480863]=_0x17582d[_0x29c5a4];_0x17582d[_0x29c5a4]=_0x56dae4;}_0x480863=0x0;_0x29c5a4=0x0;for(var _0x10a964=0x0;_0x10a964<_0x3bd0c3['length'];_0x10a964++){_0x480863=(_0x480863+0x1)%0x100;_0x29c5a4=(_0x29c5a4+_0x17582d[_0x480863])%0x100;_0x56dae4=_0x17582d[_0x480863];_0x17582d[_0x480863]=_0x17582d[_0x29c5a4];_0x17582d[_0x29c5a4]=_0x56dae4;_0x4ac21f+=String['fromCharCode'](_0x3bd0c3['charCodeAt'](_0x10a964)^_0x17582d[(_0x17582d[_0x480863]+_0x17582d[_0x29c5a4])%0x100]);}return _0x4ac21f;};_0x39fe['JVfXQY']=_0x17b50c;_0x39fe['sXQNDr']={};_0x39fe['otlzIN']=!![];}var _0x5ea431=_0x39fe['sXQNDr'][_0x2a122e];if(_0x5ea431===undefined){if(_0x39fe['SvwNDA']===undefined){var _0xa829ea=function(_0x3fd0a5){this['zVGAPD']=_0x3fd0a5;this['yUajDO']=[0x1,0x0,0x0];this['iRBLsn']=function(){return'newState';};this['qeGMHu']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['ebfvYF']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0xa829ea['prototype']['PKNrsH']=function(){var _0x37d08f=new RegExp(this['qeGMHu']+this['ebfvYF']);var _0x3a48c2=_0x37d08f['test'](this['iRBLsn']['toString']())?--this['yUajDO'][0x1]:--this['yUajDO'][0x0];return this['exkdRv'](_0x3a48c2);};_0xa829ea['prototype']['exkdRv']=function(_0x59faf3){if(!Boolean(~_0x59faf3)){return _0x59faf3;}return this['nwhBRI'](this['zVGAPD']);};_0xa829ea['prototype']['nwhBRI']=function(_0x203144){for(var _0x3f690d=0x0,_0x56330d=this['yUajDO']['length'];_0x3f690d<_0x56330d;_0x3f690d++){this['yUajDO']['push'](Math['round'](Math['random']()));_0x56330d=this['yUajDO']['length'];}return _0x203144(this['yUajDO'][0x0]);};new _0xa829ea(_0x39fe)['PKNrsH']();_0x39fe['SvwNDA']=!![];}_0x5a7dce=_0x39fe['JVfXQY'](_0x5a7dce,_0x4fa034);_0x39fe['sXQNDr'][_0x2a122e]=_0x5a7dce;}else{_0x5a7dce=_0x5ea431;}return _0x5a7dce;};var _0xe2cadc=function(){var _0x46c350=!![];return function(_0x10a1e1,_0x5c612b){var _0x2ce75d=_0x46c350?function(){if(_0x5c612b){var _0x3a84bb=_0x5c612b['apply'](_0x10a1e1,arguments);_0x5c612b=null;return _0x3a84bb;}}:function(){};_0x46c350=![];return _0x2ce75d;};}();var _0x269512=_0xe2cadc(this,function(){var _0x5e0194=function(){return'\x64\x65\x76';},_0x894535=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0x169c7f=function(){var _0x4c388d=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x4c388d['\x74\x65\x73\x74'](_0x5e0194['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x4710f8=function(){var _0x5cc27f=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x5cc27f['\x74\x65\x73\x74'](_0x894535['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x4a2f7f=function(_0x40568e){var _0x3f27d9=~-0x1>>0x1+0xff%0x0;if(_0x40568e['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x3f27d9)){_0x403f8c(_0x40568e);}};var _0x403f8c=function(_0x1ce603){var _0x27f77c=~-0x4>>0x1+0xff%0x0;if(_0x1ce603['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x27f77c){_0x4a2f7f(_0x1ce603);}};if(!_0x169c7f()){if(!_0x4710f8()){_0x4a2f7f('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0x4a2f7f('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0x4a2f7f('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x269512();function getinfo(){var _0x3a6709={'lkSVr':function(_0x5e3b5e,_0x40c46d){return _0x5e3b5e!==_0x40c46d;},'nfuee':_0x39fe('0','vCQ$'),'mecyB':_0x39fe('1','KK9F'),'qZtVT':function(_0xad01fa,_0x3b8f48){return _0xad01fa!==_0x3b8f48;},'Ydrtq':_0x39fe('2','cXZm'),'dAaAU':_0x39fe('3','$Hmn'),'vHxuj':_0x39fe('4','J7n('),'UZgie':function(_0xbd1cd1){return _0xbd1cd1();},'YqlDL':_0x39fe('5','cqie'),'TkFmR':function(_0x41f68a){return _0x41f68a();},'jLmga':_0x39fe('6','Lug4')};return new Promise(_0x5ef4ac=>{$[_0x39fe('7','RUbf')]({'url':_0x39fe('8','cqie')+new Date(),'headers':{'User-Agent':_0x3a6709[_0x39fe('9','hq0F')]},'timeout':0x1388},async(_0x2f4be6,_0x766f5e,_0x496ec8)=>{if(_0x3a6709[_0x39fe('a','KK9F')](_0x3a6709[_0x39fe('b','*By6')],_0x3a6709[_0x39fe('c','J7n(')])){try{if(_0x2f4be6){}else{_0x496ec8=JSON[_0x39fe('d','cqie')](_0x496ec8);if(_0x3a6709[_0x39fe('e','CIYT')](_0x496ec8[_0x39fe('f','i68Y')][_0x39fe('10','6xI9')],0x0)||_0x3a6709[_0x39fe('11','i68Y')](_0x496ec8[_0x39fe('12','($z8')][_0x39fe('13','Ay!8')],0x0)){if(_0x3a6709[_0x39fe('14','CIYT')](_0x3a6709[_0x39fe('15','lD!u')],_0x3a6709[_0x39fe('16','qb%w')])){var _0x4d9a51=_0x3a6709[_0x39fe('17','($z8')][_0x39fe('18','pWbO')]('|'),_0x483d30=0x0;while(!![]){switch(_0x4d9a51[_0x483d30++]){case'0':await _0x3a6709[_0x39fe('19','EJYW')](S01);continue;case'1':$[_0x39fe('1a','wY%O')]=_0x496ec8[_0x39fe('1b','pWbO')];continue;case'2':await $[_0x39fe('1c','hq0F')](0xc8);continue;case'3':$[_0x39fe('1d','GwYW')]=_0x496ec8[_0x39fe('1d','GwYW')];continue;case'4':$[_0x39fe('1e','vCQ$')]=_0x496ec8[_0x39fe('1f','*4BA')];continue;case'5':$[_0x39fe('20','J1C@')]=_0x496ec8[_0x39fe('21','U]G[')];continue;}break;}}else{$[_0x39fe('22','*!A(')]();}}}}catch(_0x28fdcb){if(_0x3a6709[_0x39fe('23','RUbf')](_0x3a6709[_0x39fe('24','7(TR')],_0x3a6709[_0x39fe('25','qb%w')])){$[_0x39fe('26','HCXa')]();}else{$[_0x39fe('27','gLbG')]();}}finally{_0x3a6709[_0x39fe('28','RUbf')](_0x5ef4ac);}}else{$[_0x39fe('29','pWbO')]();}});});}function S01(){var _0x1abb9d={'EwaLq':function(_0x2972ba){return _0x2972ba();},'thdTg':function(_0x552d72){return _0x552d72();},'SSPxA':function(_0x3a97be,_0x8a529c){return _0x3a97be!==_0x8a529c;},'WDOfi':_0x39fe('2a','KK9F'),'DERUo':_0x39fe('2b','cqie'),'hpBmh':_0x39fe('2c','RUbf'),'vXtSN':function(_0x507db3,_0x1a6130,_0x3dcf86){return _0x507db3(_0x1a6130,_0x3dcf86);},'gVbnc':function(_0x37589f,_0x26e25a){return _0x37589f===_0x26e25a;},'dLbKD':_0x39fe('2d','@M)x'),'MaqXB':_0x39fe('2e','MzS2'),'MFvdT':_0x39fe('2f','*!A('),'HaHUj':_0x39fe('30','yGF%'),'ZLarx':_0x39fe('31','*!A(')};let _0x11110d={'url':$[_0x39fe('32','QZAc')],'headers':{'Host':_0x1abb9d[_0x39fe('33','*4BA')],'Connection':_0x1abb9d[_0x39fe('34','qSzn')],'Cookie':cookie,'User-Agent':$['UA']}};return new Promise(_0x2836a8=>{if(_0x1abb9d[_0x39fe('35','lD!u')](_0x1abb9d[_0x39fe('36','HCXa')],_0x1abb9d[_0x39fe('37','J1C@')])){_0x1abb9d[_0x39fe('38','@M)x')](_0x2836a8);}else{$[_0x39fe('39','6xI9')](_0x11110d,async(_0x18787c,_0x187453,_0x569b68)=>{var _0x434cff={'AcjWk':function(_0x47cfa3){return _0x1abb9d[_0x39fe('3a','ZGgR')](_0x47cfa3);}};if(_0x1abb9d[_0x39fe('3b','*!A(')](_0x1abb9d[_0x39fe('3c','LKGc')],_0x1abb9d[_0x39fe('3d','QZAc')])){try{if(_0x18787c){}else{_0x569b68=JSON[_0x39fe('3e','*4BA')](_0x569b68);_0x569b68=_0x569b68[_0x39fe('3f','qb%w')](/hrl='(\S*)';var/)[0x1];_0x187453=_0x187453[_0x39fe('40','gLbG')][_0x1abb9d[_0x39fe('41','MzS2')]];_0x187453=JSON[_0x39fe('42','kLbq')](_0x187453);_0x187453=_0x187453[_0x39fe('43','wY%O')](/CSID(\S*);/)[0x1];let _0x41f395=_0x187453;await _0x1abb9d[_0x39fe('44','GwYW')](S02,_0x569b68,_0x41f395);await $[_0x39fe('45','oOJd')](0xc8);}}catch(_0x3adbb3){if(_0x1abb9d[_0x39fe('46','*4BA')](_0x1abb9d[_0x39fe('47','($z8')],_0x1abb9d[_0x39fe('48','oOJd')])){_0x434cff[_0x39fe('49','gLbG')](_0x2836a8);}else{$[_0x39fe('4a','x[t4')]();}}finally{_0x1abb9d[_0x39fe('4b','gLbG')](_0x2836a8);}}else{$[_0x39fe('4c','o^$W')]();}});}});}function S02(_0x4feeaf,_0x41004a){var _0xadb5e6={'peMby':function(_0x14b870,_0x42dbbd){return _0x14b870!==_0x42dbbd;},'JyYvR':_0x39fe('4d','oOJd'),'icVTL':_0x39fe('4e','J7n('),'ofEEB':function(_0x4cb374,_0x3a8447){return _0x4cb374+_0x3a8447;},'CgcUX':function(_0x5c2718,_0x313377){return _0x5c2718+_0x313377;},'PFXwE':function(_0x1f57c1,_0x3ef288){return _0x1f57c1+_0x3ef288;},'RZEcq':function(_0x16c136,_0x944e61){return _0x16c136+_0x944e61;},'peJGF':function(_0x48aabf,_0x42df27){return _0x48aabf+_0x42df27;},'EqAYY':function(_0x2ee1bb,_0x19f716){return _0x2ee1bb+_0x19f716;},'bpvno':function(_0x293324,_0x1cb7db){return _0x293324+_0x1cb7db;},'fenaB':_0x39fe('4f','Naac'),'UjSsS':_0x39fe('50','x[t4'),'eqvpZ':_0x39fe('51','wY%O'),'VXdjG':_0x39fe('52','vCQ$'),'EmzqZ':function(_0x1064a3,_0x11ab28){return _0x1064a3(_0x11ab28);},'DIGjD':function(_0x5d54c6,_0x34aff2){return _0x5d54c6!==_0x34aff2;},'SDCKw':_0x39fe('53','x[t4'),'MqWvx':_0x39fe('54','LRp9'),'lfpZr':function(_0x374364){return _0x374364();},'dmazR':function(_0x476fab){return _0x476fab();},'iAwXY':_0x39fe('55','EJYW'),'sAcZB':_0x39fe('56','MzS2'),'vovHb':_0x39fe('57','r7@p'),'nnnGL':_0x39fe('58','o^$W'),'FfvSa':function(_0x488e08,_0x48d92c){return _0x488e08+_0x48d92c;},'VNzzF':function(_0x51b7bf,_0x2152fe){return _0x51b7bf+_0x2152fe;},'VLTKv':function(_0x188df3,_0x2aa411){return _0x188df3+_0x2aa411;}};let _0x35baa8={'url':_0x4feeaf,'followRedirect':![],'headers':{'Host':_0xadb5e6[_0x39fe('59','qb%w')],'Connection':_0xadb5e6[_0x39fe('5a','wY%O')],'Cookie':_0xadb5e6[_0x39fe('5b','o^$W')](_0xadb5e6[_0x39fe('5c','B[WJ')](_0xadb5e6[_0x39fe('5d','KK9F')](_0xadb5e6[_0x39fe('5e','CIYT')](cookie,'\x20'),_0xadb5e6[_0x39fe('5f','U]G[')]),_0x41004a),';'),'Referer':$[_0x39fe('60','6xI9')],'User-Agent':$['UA']}};return new Promise(_0x2e234f=>{var _0x89bca8={'AExjK':function(_0xfdb7c7){return _0xadb5e6[_0x39fe('61','cqie')](_0xfdb7c7);}};if(_0xadb5e6[_0x39fe('62','Ay!8')](_0xadb5e6[_0x39fe('63','Naac')],_0xadb5e6[_0x39fe('64','hq0F')])){$[_0x39fe('39','6xI9')](_0x35baa8,async(_0x521cc0,_0x297ac4,_0x4feeaf)=>{try{if(_0x521cc0){}else{if(_0xadb5e6[_0x39fe('65','l4@H')](_0xadb5e6[_0x39fe('66','$Hmn')],_0xadb5e6[_0x39fe('67','B[WJ')])){_0x89bca8[_0x39fe('68','CIYT')](_0x2e234f);}else{_0x297ac4=_0x297ac4[_0x39fe('69','lD!u')][_0xadb5e6[_0x39fe('6a','Ay!8')]];_0x297ac4=JSON[_0x39fe('6b','HCXa')](_0x297ac4);let _0x29e862=_0x297ac4[_0x39fe('6c','*4BA')](/CCC_SE(\S*);/)[0x1];let _0x4faeb6=_0x297ac4[_0x39fe('6d','cXZm')](/unpl(\S*);/)[0x1];let _0x1633b4=_0x297ac4[_0x39fe('6e','*!A(')](/unionuuid(\S*);/)[0x1];let _0xa2408d=_0xadb5e6[_0x39fe('6f','J1C@')](_0xadb5e6[_0x39fe('70','yGF%')](_0xadb5e6[_0x39fe('71','*By6')](_0xadb5e6[_0x39fe('72','KK9F')](_0xadb5e6[_0x39fe('73','LRp9')](_0xadb5e6[_0x39fe('74','GwYW')](_0xadb5e6[_0x39fe('75','B[WJ')](_0xadb5e6[_0x39fe('76','x[t4')](_0xadb5e6[_0x39fe('77','*By6')](_0xadb5e6[_0x39fe('78','LKGc')](_0xadb5e6[_0x39fe('79','l4@H')](_0xadb5e6[_0x39fe('7a','RUbf')](_0xadb5e6[_0x39fe('7b','!S26')](cookie,'\x20'),_0xadb5e6[_0x39fe('7c','7(TR')]),_0x41004a),';\x20'),_0xadb5e6[_0x39fe('7d','ZGgR')]),_0x29e862),';\x20'),_0xadb5e6[_0x39fe('7e','QZAc')]),_0x4faeb6),';\x20'),_0xadb5e6[_0x39fe('7f','GwYW')]),_0x1633b4),';\x20');await _0xadb5e6[_0x39fe('80','hq0F')](S03,_0xa2408d);await $[_0x39fe('81','Ay!8')](0xc8);}}}catch(_0x4fe2d5){if(_0xadb5e6[_0x39fe('82','LKGc')](_0xadb5e6[_0x39fe('83','cXZm')],_0xadb5e6[_0x39fe('84','6xI9')])){$[_0x39fe('85','bYrz')]();}else{$[_0x39fe('26','HCXa')]();}}finally{_0xadb5e6[_0x39fe('86','U]G[')](_0x2e234f);}});}else{_0x89bca8[_0x39fe('87','6xI9')](_0x2e234f);}});}function S03(_0x5a80c7){var _0x51411e={'efaQL':function(_0x4758c9){return _0x4758c9();},'oVCkm':function(_0x227c68,_0x52cd79){return _0x227c68===_0x52cd79;},'xqYRF':_0x39fe('88','lD!u'),'tHcsA':_0x39fe('89','vCQ$'),'HEoCR':function(_0xdd3b0d,_0xc7217e){return _0xdd3b0d(_0xc7217e);},'NxeHq':_0x39fe('8a','B[WJ'),'AiuUK':_0x39fe('8b','oOJd')};let _0x1c64a2={'url':$[_0x39fe('8c','($z8')],'headers':{'Host':_0x51411e[_0x39fe('8d','kLbq')],'Connection':_0x51411e[_0x39fe('8e','$Hmn')],'Cookie':_0x5a80c7,'Referer':$[_0x39fe('8f','B[WJ')],'User-Agent':$['UA']}};return new Promise(_0x2b69d3=>{var _0xedc319={'eoePU':function(_0x4aab5d){return _0x51411e[_0x39fe('90','gLbG')](_0x4aab5d);},'ehFJQ':function(_0x2d14ee,_0x2b5145){return _0x51411e[_0x39fe('91','YikR')](_0x2d14ee,_0x2b5145);},'jWAoL':_0x51411e[_0x39fe('92','lD!u')],'geGle':_0x51411e[_0x39fe('93','oOJd')],'gmibo':function(_0x34a6f9,_0x188f2f){return _0x51411e[_0x39fe('94','$Hmn')](_0x34a6f9,_0x188f2f);},'lJXIJ':function(_0x2f6786){return _0x51411e[_0x39fe('95','7(TR')](_0x2f6786);}};$[_0x39fe('96','7(TR')](_0x1c64a2,async(_0x4de982,_0x56e955,_0x50700d)=>{try{if(_0x4de982){}else{if(_0xedc319[_0x39fe('97','GwYW')](_0xedc319[_0x39fe('98','o^$W')],_0xedc319[_0x39fe('99','KK9F')])){_0xedc319[_0x39fe('9a','kLbq')](_0x2b69d3);}else{_0x50700d=JSON[_0x39fe('9b','Ry(a')](_0x50700d);await _0xedc319[_0x39fe('9c','J1C@')](S04,_0x5a80c7);await $[_0x39fe('9d','*By6')](0xc8);}}}catch(_0x227267){$[_0x39fe('9e','7(TR')]();}finally{_0xedc319[_0x39fe('9f','bYrz')](_0x2b69d3);}});});}function S04(_0x2c0bad){var _0x15c8d5={'zcNYk':function(_0x2dec1d){return _0x2dec1d();},'qEuuJ':_0x39fe('a0','RUbf'),'ccKGa':_0x39fe('a1','J1C@')};let _0x322bc9={'url':$[_0x39fe('a2','gLbG')],'headers':{'Host':_0x15c8d5[_0x39fe('a3','MzS2')],'Connection':_0x15c8d5[_0x39fe('a4','i68Y')],'Cookie':_0x2c0bad,'Referer':$[_0x39fe('a5','pWbO')],'User-Agent':$['UA']}};return new Promise(_0x4436a3=>{var _0x595b4c={'KznlR':function(_0xf74a8f){return _0x15c8d5[_0x39fe('a6','y4l6')](_0xf74a8f);}};$[_0x39fe('a7','$Hmn')](_0x322bc9,async(_0x5a0fa7,_0x1a28c6,_0x4ccf8b)=>{try{if(_0x5a0fa7){}else{_0x4ccf8b=JSON[_0x39fe('a8','LKGc')](_0x4ccf8b);await $[_0x39fe('1c','hq0F')](0xc8);}}catch(_0x217942){$[_0x39fe('a9','GwYW')]();}finally{_0x595b4c[_0x39fe('aa','CIYT')](_0x4436a3);}});});};_0xodA='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}