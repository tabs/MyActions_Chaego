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
var _0xodw='jsjiami.com.v6',_0x341e=[_0xodw,'SHM7wogz','w4LDqcKACQM=','wpxyQz1i','woPDtsONw5JG','WV0AI8OD','w7XCnMOoUVE=','flEdwpoJ','Zmg0w4zDjw==','VCJa','C3XDpnAl','aMOnESV7','wonCscKodkA=','ccO7VQ7Cjg==','wrYiw54mYA==','wpE+w6bDqsKr','wo/CssK2T1o=','wr4XwoXDosOO','KsKAMcK4w5cNJ8OuTA==','wqLCuCjCiiI=','wowyKBxjwrdW','wrXDhcOiw55a','G23CkwbDtlswK2I=','w6JKNxxI','ZkoHI8OK','ZG0CHA==','w6IBOsKJZw==','GnEcwpHDnA==','NsO1wqjDskU=','wohRw5fDpH3Duw==','Vg9Iw55m','Rn0wwrg4','wpTCn8KcYX5H','XDZYwqjDnw==','eMKdEsK9w5g=','UyfCp8OJw4jDpkAsYBA=','dB51MQ==','dA5/Kjlb','a8OCVyY=','woInwpLCq1DDtD7DmhM=','wpAXw5rDisK+','SC91w7ly','wqMEw7MWWQ==','flgZw5DDrw==','w7oFKRsOw7nDkMKH','wp4aw47DlcOHUMOXwoLCtSk=','wpU/YsKvXyoHVsKUNULDscOXbMKEw7rCjAEbw6RqR8KlIVHCr8OkemfChhxRfMO7wrFnw6YqBsK6PMKKwqQow5vChVoJwr1+fsO4wptFUVNOwrh/w54Gw5XCsRYyTxXCtFHCgyZQwofDj8OmwrpXc0B2JcKVwqk7wr7Cv8ObCMOjwp7DhMKewoZbETPCrMOhLMOGcB9EOsKEwpzCnUodw6HCoWPCscO3H8OrJsKDw4Ukb8K2UsO1TAZCfAM1wp3CjRsJAi3CtcK9cg==','wpMgacKvYg==','wqPCiCvCiDM=','w6lMAixj','RsKvZMKJEQ==','MWzCjCnDoQ==','XATDuH/DoQ==','OFtzOsKz','UmAH','H8K4DMKkw4E=','eEYtwpk7','woHCri5Vw7Y=','wp3Cv8O7CMKK','eDTCn8KHw7k=','IcKxG8KGw5c=','woJIw7bDhl8=','VwROw4FU','wrvCgQdpw6Q=','wrEYwqLCvHw=','wo3CjhZKw5A=','eXggGMOK','VRPCtMKKw4I=','wovDpcOAw4Rj','VMOKYCzCng==','wq/CsA9Lw5w=','I3RYBxw=','woPCrsKwwqbDpQ==','GVxXAAA=','wpjCosOzPsKW','RwnDhnTDig==','MsOlwrHCkU8=','UChI','VH4zMMOo','WgBIwpfDtw==','wovDg8OFw79U','wpQWMxJC','woPCjDZ9w7bCpMOR','wpTDvcOGw6VK','IVtKI8KQw7XDmxcW','wrwhwoPDhcOH','wrYKw7MHUA==','w4kqwqPDrsOz','wqM0ARN+','wp1fU8OEw5g=','wq3Di8OVwpPDhA==','w7HDocKZAAw=','P8OBwp7CjHU=','dEYBwrsP','LlTDsnUJ','w4XCscOlYVY=','Z8OiEQhL','wrHCnhRbw6E=','SXsoKsO1','WsOxNz1K','GMOSwqfDrUE=','wpjCp8OnF8KY','XTp4w7Ry','KMKGN8K5OA==','wojDucOUwo3Dkg==','w5XCtMOpYg==','Z3MRwqks','UD9NFCA=','GmPCrxXDjA==','wrcEw6AhSsKf','WyJbMBhs','NXLCiMKrcw==','BXLCh0xZ','WSBMBjI=','dsKueVRcw78Pw5nCgGPDuMOW','HXHChkUawrHDhQXDkD4=','fihUwpvDqm8VD8KNfsOOw6jCowbCr8K9ZwfDtcOkTcKmwo/DqBzCpcOIacK1wpR2w40LI8KqfsK0GRLDhRbDg27Cv8KpAMOeS8K9N8OKwr3CgFLDisKVw4bDscOIfMKawqTCgGLDvcOnT8K9w7zClsKJDFLDuhzCqxPCmMKYwpYww4fCmxjDmi3Csw3CosODYB0QTMKDwr51wo3DpMOtVsKNchDDrMKwwphPK8K7VC/ClnzDtsK5eDLCm3nCvm3DlADCpn/Dp0/CqMKDd1XCoMOmbMOhTADDgg==','wq4Zw6tV','wq0Bw5RwwqY=','w7ZdJS9p','wokRFFbDpQ==','WXAMBsOJ','w7vDoMKCJBc=','c8OdYybChA==','w6LCnMK4w53Dig==','GMK+OsKww44=','ccOiAQ==','fXsFwr42','JXt0OsKG','SG8aw4nDlQ==','b8K7e8K8DQ==','wqbCihRbw4k=','AXXCikE=','GnvChHBFwqI=','w7EuOcKGQw==','HsO0wqjCsX0Ww6xaW1nDusKp','wrXCn8KBTWBZwqzCiMKqwonCrcKsL2NLABN1wrnDpD7CqMKGA3I5wqHDoXVVb8O3D8OIDMKXY8OOwoLCmsOlHSBIc8KGPsOtwq8+wqZ4wrTCs8KHwq4FWn84w5LCpRQVw53DqHFaw4LCv8KbGmfCgMKkTsK7HDEUZ8O0wq5qCzdqw43DssKywr50wq0Iw61jZkVcwqo0AMK/C8K3w73CjiPDscOnIsOITSkfIVlSXsO0wqYYR8Kuwp4jGklhwqLCu8KcbMODRFfDuBnCtw==','E07DkwA=','dihsHTM=','OXvCh8KjYA==','VTDCv8K2w44=','OsOxwonDj3Q=','w5rClsK/w5fDqg==','MsOSwoHCjw==','BHbChirDqk4=','w6PCl8Oie1c=','NllAESM=','Z8OrAXvCvQ==','w5/ClWZlwqHCqsKSw44bRMKS','dE8UB8OP','R2k6w57DtQ==','wrpwdSlFwpDDnsKJw77CkMOuOsKrEcKPfh3Dum7DlHNAwoVYU8OeRMKYL8K9XMKew5dsIyM/woDClsOSw6/CpBTCg8OQwoJlAMKMDMObwpXCtVHCjkhAbVbCqR7Cjj4TcAsYw5DDrMKIw4lpBh7Cs8OBPg==','SgNkw5hPRsOLwqrCrCfCtnpFTSNBwoNmwr/Cq8ObXGzDm8KVJTzDhMOdLlN3w7bCkcO4wrPDmSAIwqg9VcOMPcO0woTCkwbCsMO3AyIpSsKcw4HDvjIsDMO/OkHChMORdMOSAcKSwqVLD1QNwrUfworCnsK9w63Ds8ONDcO6wr7DlncIXATCrQ5pwrzCncK1wqfDswEWwqh6wqXDhTBLY8OHbTDDgcKiE1XDlQbDvF/Cv8KrwoDDpcKVwoXDoVIcWMOzR8KPw40+w5fCmsOqw7tOwoPCvsKpOMOowrzDqkRWb8KAw4HCgsKLw4rCrRN7','wpPCpsKYSlU=','SxViwqrDsQ==','AcK5NsKkw70=','wr0Pw5Rrwqc=','TsOCADpe','acKdPMKBw7c=','P1ZsDwg=','woseHhd3','eGcsCsO+','D3zClQ==','wrbCtsKXUE4=','Tnw3w4vDmA==','wqJwexh8','MWjClgDDqw==','w68rIsKeYw==','ZwbDhU7DlQ==','cMOyDj5y','wo3CgsKXFQ==','w4guwrnDqsOvw4A=','ZxPDjXzDug==','LMKGL8Oj','ClnDkVUJAw==','w4sTLsKsbw==','IHAZwpXDvQ==','w7pZLy1F','GlxhBwM=','w7pZL04=','ZMK9HMOo','JnIZw44=','wpFMw5zCkw==','CMOlwqjDqw==','V8OrGQ==','w4YKDw==','wo3CkcOlI8Ke','EV7CiMKKWQw=','OGDCrCTDqg==','wr4bScK+ZA==','wr5Iw6nDkGY=','P28SwrnDu2s=','wowow7rDosKY','woAJw7ZzwqY=','P1lZIzA=','w5TCpcOpQWI=','w6bCpsOYUEE=','RzFGwrnDng==','wqFhdXRVw4XCnsONw7TCkQ==','LsKOC8K4w7g=','wpcaIm3Dpg==','w7PCnMKpw5zDtg==','wpEQw5rDhSHDqsOTw6E=','OsKTAMKOei5BwovCtcOo','wpg3w5RwwpwEAcOBw4Y1w7bChi/DosKtwqXCiALClB3CnMKewr4zwqDCqcKyWMO3wpLCncKYwrhmw71bw63DgMO6w4I2w6zDrxLDl8OQc2Uow4/DtMOdaMKvPcO5QsKhwogcwpFUw4Ubwqopwq9CAn4tU8OTwoJmEC15FRMAw43DrlvClnM4VcKowo02ZFg5IWosGsKlwrVwKhzDpzvCosKTwoQwAsOowoZmw77DmsO2wonCp2t4DcKTwojDrcK3w51dw7DCrMKpw6kGwpRlw6N4cgPCmg==','wr0PFA==','wpovwqXDsMON','NG3CgFhd','UMKaaD5/','H1phJ8Kr','c8OwG3rCqg==','HXY3wpjDnQ==','BVTCh8K7fw==','wrjCk8KUwpjDhw==','w7TDqMKUPyA=','wrMRHzde','NdlwBYjOsjBIiqadmJi.BcFHom.v6=='];(function(_0x128d3c,_0x3b6470,_0x17b7bd){var _0x263080=function(_0x1e62e3,_0x5e82aa,_0x1b8c2d,_0x47815c,_0x3fa630){_0x5e82aa=_0x5e82aa>>0x8,_0x3fa630='po';var _0x1ba126='shift',_0x119495='push';if(_0x5e82aa<_0x1e62e3){while(--_0x1e62e3){_0x47815c=_0x128d3c[_0x1ba126]();if(_0x5e82aa===_0x1e62e3){_0x5e82aa=_0x47815c;_0x1b8c2d=_0x128d3c[_0x3fa630+'p']();}else if(_0x5e82aa&&_0x1b8c2d['replace'](/[NdlwBYOBIqdJBFH=]/g,'')===_0x5e82aa){_0x128d3c[_0x119495](_0x47815c);}}_0x128d3c[_0x119495](_0x128d3c[_0x1ba126]());}return 0xb1f0f;};var _0xc6eb7=function(){var _0x1e3084={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x4f27ce,_0x5a5f7f,_0x227f6e,_0xc05be8){_0xc05be8=_0xc05be8||{};var _0x5883c1=_0x5a5f7f+'='+_0x227f6e;var _0x4cdcde=0x0;for(var _0x4cdcde=0x0,_0x3db657=_0x4f27ce['length'];_0x4cdcde<_0x3db657;_0x4cdcde++){var _0x47bc15=_0x4f27ce[_0x4cdcde];_0x5883c1+=';\x20'+_0x47bc15;var _0x1b1f6a=_0x4f27ce[_0x47bc15];_0x4f27ce['push'](_0x1b1f6a);_0x3db657=_0x4f27ce['length'];if(_0x1b1f6a!==!![]){_0x5883c1+='='+_0x1b1f6a;}}_0xc05be8['cookie']=_0x5883c1;},'removeCookie':function(){return'dev';},'getCookie':function(_0x3883e3,_0x4d474f){_0x3883e3=_0x3883e3||function(_0x56eec6){return _0x56eec6;};var _0x38b5ec=_0x3883e3(new RegExp('(?:^|;\x20)'+_0x4d474f['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x146bb6=typeof _0xodw=='undefined'?'undefined':_0xodw,_0x26ec17=_0x146bb6['split'](''),_0x184d5e=_0x26ec17['length'],_0x2eb1f0=_0x184d5e-0xe,_0xb90be5;while(_0xb90be5=_0x26ec17['pop']()){_0x184d5e&&(_0x2eb1f0+=_0xb90be5['charCodeAt']());}var _0x15aa6e=function(_0x2ce915,_0x48c923,_0x5e0423){_0x2ce915(++_0x48c923,_0x5e0423);};_0x2eb1f0^-_0x184d5e===-0x524&&(_0xb90be5=_0x2eb1f0)&&_0x15aa6e(_0x263080,_0x3b6470,_0x17b7bd);return _0xb90be5>>0x2===0x14b&&_0x38b5ec?decodeURIComponent(_0x38b5ec[0x1]):undefined;}};var _0x216331=function(){var _0x4fd0f3=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x4fd0f3['test'](_0x1e3084['removeCookie']['toString']());};_0x1e3084['updateCookie']=_0x216331;var _0x36fcdf='';var _0x4817b2=_0x1e3084['updateCookie']();if(!_0x4817b2){_0x1e3084['setCookie'](['*'],'counter',0x1);}else if(_0x4817b2){_0x36fcdf=_0x1e3084['getCookie'](null,'counter');}else{_0x1e3084['removeCookie']();}};_0xc6eb7();}(_0x341e,0x91,0x9100));var _0x2ce7=function(_0x487b1c,_0x52df8d){_0x487b1c=~~'0x'['concat'](_0x487b1c);var _0xcf6f52=_0x341e[_0x487b1c];if(_0x2ce7['dCnWcJ']===undefined){(function(){var _0x5e37b3;try{var _0x277e2d=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');');_0x5e37b3=_0x277e2d();}catch(_0x127bf9){_0x5e37b3=window;}var _0x341b29='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x5e37b3['atob']||(_0x5e37b3['atob']=function(_0x49172a){var _0x41f402=String(_0x49172a)['replace'](/=+$/,'');for(var _0x74aa29=0x0,_0x1ae8cd,_0xd8f3b0,_0x1ac7ec=0x0,_0xf52079='';_0xd8f3b0=_0x41f402['charAt'](_0x1ac7ec++);~_0xd8f3b0&&(_0x1ae8cd=_0x74aa29%0x4?_0x1ae8cd*0x40+_0xd8f3b0:_0xd8f3b0,_0x74aa29++%0x4)?_0xf52079+=String['fromCharCode'](0xff&_0x1ae8cd>>(-0x2*_0x74aa29&0x6)):0x0){_0xd8f3b0=_0x341b29['indexOf'](_0xd8f3b0);}return _0xf52079;});}());var _0x2a1f9b=function(_0x5d5af9,_0x52df8d){var _0x2c7a0e=[],_0x500231=0x0,_0x1b4fde,_0x3244cc='',_0x481788='';_0x5d5af9=atob(_0x5d5af9);for(var _0x39150b=0x0,_0x1955e1=_0x5d5af9['length'];_0x39150b<_0x1955e1;_0x39150b++){_0x481788+='%'+('00'+_0x5d5af9['charCodeAt'](_0x39150b)['toString'](0x10))['slice'](-0x2);}_0x5d5af9=decodeURIComponent(_0x481788);for(var _0x3c2d6d=0x0;_0x3c2d6d<0x100;_0x3c2d6d++){_0x2c7a0e[_0x3c2d6d]=_0x3c2d6d;}for(_0x3c2d6d=0x0;_0x3c2d6d<0x100;_0x3c2d6d++){_0x500231=(_0x500231+_0x2c7a0e[_0x3c2d6d]+_0x52df8d['charCodeAt'](_0x3c2d6d%_0x52df8d['length']))%0x100;_0x1b4fde=_0x2c7a0e[_0x3c2d6d];_0x2c7a0e[_0x3c2d6d]=_0x2c7a0e[_0x500231];_0x2c7a0e[_0x500231]=_0x1b4fde;}_0x3c2d6d=0x0;_0x500231=0x0;for(var _0x2508b4=0x0;_0x2508b4<_0x5d5af9['length'];_0x2508b4++){_0x3c2d6d=(_0x3c2d6d+0x1)%0x100;_0x500231=(_0x500231+_0x2c7a0e[_0x3c2d6d])%0x100;_0x1b4fde=_0x2c7a0e[_0x3c2d6d];_0x2c7a0e[_0x3c2d6d]=_0x2c7a0e[_0x500231];_0x2c7a0e[_0x500231]=_0x1b4fde;_0x3244cc+=String['fromCharCode'](_0x5d5af9['charCodeAt'](_0x2508b4)^_0x2c7a0e[(_0x2c7a0e[_0x3c2d6d]+_0x2c7a0e[_0x500231])%0x100]);}return _0x3244cc;};_0x2ce7['gjFyBS']=_0x2a1f9b;_0x2ce7['rjdMbS']={};_0x2ce7['dCnWcJ']=!![];}var _0x4907a7=_0x2ce7['rjdMbS'][_0x487b1c];if(_0x4907a7===undefined){if(_0x2ce7['DuEIBq']===undefined){var _0x51e03c=function(_0x2b9e92){this['iXWHHE']=_0x2b9e92;this['NNlFtN']=[0x1,0x0,0x0];this['ktnKCI']=function(){return'newState';};this['GQDMHu']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['SrsjJN']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x51e03c['prototype']['pbxaGK']=function(){var _0x369a26=new RegExp(this['GQDMHu']+this['SrsjJN']);var _0x1f5ea3=_0x369a26['test'](this['ktnKCI']['toString']())?--this['NNlFtN'][0x1]:--this['NNlFtN'][0x0];return this['bZNFHs'](_0x1f5ea3);};_0x51e03c['prototype']['bZNFHs']=function(_0x322b12){if(!Boolean(~_0x322b12)){return _0x322b12;}return this['dpQrSB'](this['iXWHHE']);};_0x51e03c['prototype']['dpQrSB']=function(_0x46538c){for(var _0x306203=0x0,_0x3fb388=this['NNlFtN']['length'];_0x306203<_0x3fb388;_0x306203++){this['NNlFtN']['push'](Math['round'](Math['random']()));_0x3fb388=this['NNlFtN']['length'];}return _0x46538c(this['NNlFtN'][0x0]);};new _0x51e03c(_0x2ce7)['pbxaGK']();_0x2ce7['DuEIBq']=!![];}_0xcf6f52=_0x2ce7['gjFyBS'](_0xcf6f52,_0x52df8d);_0x2ce7['rjdMbS'][_0x487b1c]=_0xcf6f52;}else{_0xcf6f52=_0x4907a7;}return _0xcf6f52;};var _0x50c924=function(){var _0x3895d6=!![];return function(_0x3c2eda,_0x3d99f8){var _0x10c54f=_0x3895d6?function(){if(_0x3d99f8){var _0x594cd9=_0x3d99f8['apply'](_0x3c2eda,arguments);_0x3d99f8=null;return _0x594cd9;}}:function(){};_0x3895d6=![];return _0x10c54f;};}();var _0x2aa803=_0x50c924(this,function(){var _0xb479be=function(){return'\x64\x65\x76';},_0x4bb6ab=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0x1ce7ab=function(){var _0x28d2fd=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x28d2fd['\x74\x65\x73\x74'](_0xb479be['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x5c3961=function(){var _0x363646=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x363646['\x74\x65\x73\x74'](_0x4bb6ab['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x3b7cce=function(_0x13baec){var _0x5e5845=~-0x1>>0x1+0xff%0x0;if(_0x13baec['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x5e5845)){_0x3c5167(_0x13baec);}};var _0x3c5167=function(_0x31fd7a){var _0x4462fe=~-0x4>>0x1+0xff%0x0;if(_0x31fd7a['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x4462fe){_0x3b7cce(_0x31fd7a);}};if(!_0x1ce7ab()){if(!_0x5c3961()){_0x3b7cce('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0x3b7cce('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0x3b7cce('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x2aa803();function getinfo(){var _0x381636={'kVcnY':function(_0x114b3f){return _0x114b3f();},'xRLXw':function(_0xffa22b,_0x3113bb){return _0xffa22b!==_0x3113bb;},'XMuuD':_0x2ce7('0','HjKE'),'hWzrW':_0x2ce7('1','pd^6'),'NDtEf':_0x2ce7('2','(rGE'),'PxaZn':_0x2ce7('3','0RcQ'),'oIWoq':_0x2ce7('4','$JML'),'kkGby':function(_0x5c7bea){return _0x5c7bea();},'NFltB':_0x2ce7('5','82]g'),'qGaru':_0x2ce7('6','Tsy1')};return new Promise(_0x2217b1=>{var _0x3ccab2={'yWQGr':function(_0x1e17f5){return _0x381636[_0x2ce7('7','FZPj')](_0x1e17f5);},'ptzAJ':function(_0x365d85,_0x2bc07e){return _0x381636[_0x2ce7('8','GKSY')](_0x365d85,_0x2bc07e);},'Yqwos':_0x381636[_0x2ce7('9','OFD3')],'hMATo':_0x381636[_0x2ce7('a','O31X')],'LuMfc':_0x381636[_0x2ce7('b','m7a1')],'PyMKr':function(_0x3a8762,_0x2c6f7b){return _0x381636[_0x2ce7('c','!Ba3')](_0x3a8762,_0x2c6f7b);},'fKQxW':_0x381636[_0x2ce7('d','HjKE')],'ZvYqi':_0x381636[_0x2ce7('e','y2op')],'UQXjV':function(_0x341bb0){return _0x381636[_0x2ce7('f','ry4R')](_0x341bb0);}};$[_0x2ce7('10','246U')]({'url':_0x381636[_0x2ce7('11','FZPj')],'headers':{'User-Agent':_0x381636[_0x2ce7('12','$JML')]},'timeout':0x1388},async(_0xb77e3,_0x1ee744,_0x5843f5)=>{try{if(_0xb77e3){}else{if(_0x3ccab2[_0x2ce7('13','82]g')](_0x3ccab2[_0x2ce7('14','246U')],_0x3ccab2[_0x2ce7('15','i1)!')])){_0x5843f5=JSON[_0x2ce7('16','agRE')](_0x5843f5);if(_0x3ccab2[_0x2ce7('17','m7a1')](_0x5843f5[_0x2ce7('18','FZPj')][_0x2ce7('19','X&Ed')],0x0)||_0x3ccab2[_0x2ce7('1a','agRE')](_0x5843f5[_0x2ce7('1b','OFD3')][_0x2ce7('1c','OFMG')],0x0)){var _0x5da448=_0x3ccab2[_0x2ce7('1d','i1)!')][_0x2ce7('1e','NzG8')]('|'),_0x181152=0x0;while(!![]){switch(_0x5da448[_0x181152++]){case'0':$[_0x2ce7('1f','HKTT')]=_0x5843f5[_0x2ce7('20','HjKE')];continue;case'1':$[_0x2ce7('21','HKTT')]=_0x5843f5[_0x2ce7('22','!Ba3')];continue;case'2':$[_0x2ce7('23','NzG8')]=_0x5843f5[_0x2ce7('24','E5V3')];continue;case'3':await $[_0x2ce7('25','VEvN')](0xc8);continue;case'4':$[_0x2ce7('26','pd^6')]=_0x5843f5[_0x2ce7('27','i1)!')];continue;case'5':await _0x3ccab2[_0x2ce7('28','E1F5')](S01);continue;}break;}}}else{$[_0x2ce7('29','$&Uh')]();}}}catch(_0x30eaab){if(_0x3ccab2[_0x2ce7('2a','246U')](_0x3ccab2[_0x2ce7('2b','2zdN')],_0x3ccab2[_0x2ce7('2c','E5V3')])){$[_0x2ce7('2d','NzG8')]();}else{_0x3ccab2[_0x2ce7('2e','%u^E')](_0x2217b1);}}finally{_0x3ccab2[_0x2ce7('2f','O31X')](_0x2217b1);}});});}function S01(){var _0x246729={'MuYmU':function(_0x105b54){return _0x105b54();},'ewnsG':function(_0x36377a){return _0x36377a();},'NvBdT':function(_0x7c4d31,_0xdec8c5){return _0x7c4d31===_0xdec8c5;},'xehtT':_0x2ce7('30','HjKE'),'jMbNw':_0x2ce7('31','P)RF'),'BjETT':_0x2ce7('32','P)RF'),'WFVOX':_0x2ce7('33','GKSY'),'FGLDn':_0x2ce7('34','82]g'),'tkQbw':function(_0x2221f9,_0x357154,_0xfa69b9){return _0x2221f9(_0x357154,_0xfa69b9);},'bCLof':_0x2ce7('35','OFD3'),'WIhGt':function(_0x106675,_0x1f9712){return _0x106675!==_0x1f9712;},'pejVT':_0x2ce7('36',']Dik'),'YSbub':_0x2ce7('37','Qd&2'),'KoRVb':_0x2ce7('38','E5V3'),'Bycmj':_0x2ce7('39','h@m0'),'GDxDN':_0x2ce7('3a','O31X')};let _0x12bf1f={'url':$[_0x2ce7('3b',']Dik')],'headers':{'Host':_0x246729[_0x2ce7('3c','UDpO')],'Connection':_0x246729[_0x2ce7('3d','rIvr')],'Cookie':cookie,'User-Agent':_0x246729[_0x2ce7('3e','WMDD')]}};return new Promise(_0x5d292a=>{var _0x1ac0d3={'oWrDa':function(_0x164caf){return _0x246729[_0x2ce7('3f','8BWJ')](_0x164caf);},'QcVoE':function(_0x4709d7){return _0x246729[_0x2ce7('40','pd^6')](_0x4709d7);},'mIYBX':function(_0x3c40d4,_0x2a3c95){return _0x246729[_0x2ce7('41','NzG8')](_0x3c40d4,_0x2a3c95);},'haeZC':_0x246729[_0x2ce7('42','$&Uh')],'qASRL':_0x246729[_0x2ce7('43','nX$z')],'dAMOA':_0x246729[_0x2ce7('44','SUXH')],'wBMkV':_0x246729[_0x2ce7('45','y2op')],'Tpccz':_0x246729[_0x2ce7('46',')m*A')],'uFlKM':function(_0x24a148,_0x3ad1d6,_0x41941f){return _0x246729[_0x2ce7('47','SUXH')](_0x24a148,_0x3ad1d6,_0x41941f);},'egYCk':function(_0x2cdb76,_0x3b9f96){return _0x246729[_0x2ce7('48','82]g')](_0x2cdb76,_0x3b9f96);},'IqimU':_0x246729[_0x2ce7('49','ZQDk')],'HIGte':function(_0x2ec3bb){return _0x246729[_0x2ce7('4a','0RcQ')](_0x2ec3bb);}};if(_0x246729[_0x2ce7('4b','P)RF')](_0x246729[_0x2ce7('4c',')m*A')],_0x246729[_0x2ce7('4d','$JML')])){$[_0x2ce7('4e','GKSY')](_0x12bf1f,async(_0x325d54,_0x911b1b,_0x39a089)=>{try{if(_0x1ac0d3[_0x2ce7('4f','OFMG')](_0x1ac0d3[_0x2ce7('50','m7a1')],_0x1ac0d3[_0x2ce7('51','FZPj')])){_0x1ac0d3[_0x2ce7('52','g@Zq')](_0x5d292a);}else{if(_0x325d54){}else{if(_0x1ac0d3[_0x2ce7('53','g7Pf')](_0x1ac0d3[_0x2ce7('54','%u^E')],_0x1ac0d3[_0x2ce7('55','FZPj')])){_0x1ac0d3[_0x2ce7('56','UDpO')](_0x5d292a);}else{_0x39a089=JSON[_0x2ce7('57','OFD3')](_0x39a089);_0x39a089=_0x39a089[_0x2ce7('58','5txG')](/hrl='(\S*)';var/)[0x1];_0x911b1b=_0x911b1b[_0x2ce7('59','y2op')][_0x1ac0d3[_0x2ce7('5a','ZQDk')]];_0x911b1b=JSON[_0x2ce7('5b','246U')](_0x911b1b);_0x911b1b=_0x911b1b[_0x2ce7('5c','HKTT')](/CSID(\S*);/)[0x1];let _0x368e9f=_0x911b1b;await _0x1ac0d3[_0x2ce7('5d','ry4R')](S02,_0x39a089,_0x368e9f);await $[_0x2ce7('5e','ry4R')](0xc8);}}}}catch(_0x5b94ae){if(_0x1ac0d3[_0x2ce7('5f','i1)!')](_0x1ac0d3[_0x2ce7('60','NzG8')],_0x1ac0d3[_0x2ce7('61','VEvN')])){$[_0x2ce7('62','E5V3')]();}else{_0x1ac0d3[_0x2ce7('63','Tsy1')](_0x5d292a);}}finally{_0x1ac0d3[_0x2ce7('64',')m*A')](_0x5d292a);}});}else{$[_0x2ce7('65','FZPj')]();}});}function S02(_0x4c2849,_0x3ab39f){var _0x23d8bd={'vrZUf':function(_0x5b0b7c){return _0x5b0b7c();},'jGyLe':function(_0x3e1735,_0x345569){return _0x3e1735!==_0x345569;},'iyOlf':_0x2ce7('66','GKSY'),'XvLcR':_0x2ce7('67','!Ba3'),'xEXWn':_0x2ce7('68','GIz9'),'fvFgP':function(_0xe29ec7,_0x127668){return _0xe29ec7+_0x127668;},'PhPpw':function(_0x1a881c,_0x2d14e1){return _0x1a881c+_0x2d14e1;},'FQYxB':function(_0x11cd80,_0x21c96b){return _0x11cd80+_0x21c96b;},'fgASC':function(_0x57b34e,_0x3ba76a){return _0x57b34e+_0x3ba76a;},'jtKpM':_0x2ce7('69','YOWh'),'uQgni':_0x2ce7('6a','YOWh'),'jPAyC':_0x2ce7('6b','g@Zq'),'JfGfq':_0x2ce7('6c','p2V*'),'DYXRO':function(_0x4568c,_0x5b9c1d){return _0x4568c(_0x5b9c1d);},'LZURz':_0x2ce7('6d','%u^E'),'QpFpU':_0x2ce7('6e','Tsy1'),'ldGZz':function(_0x181df7,_0x30739a){return _0x181df7===_0x30739a;},'PnqIz':_0x2ce7('6f','g7Pf'),'wVYjh':_0x2ce7('70','$JML'),'KpqiQ':_0x2ce7('71','HKTT'),'lQway':_0x2ce7('72','%u^E'),'YumFy':function(_0x4c2aea,_0x43d689){return _0x4c2aea+_0x43d689;},'KcOBQ':function(_0x595c2f,_0x62a37a){return _0x595c2f+_0x62a37a;},'FLOux':_0x2ce7('73','2zdN')};let _0x33d8a7={'url':_0x4c2849,'followRedirect':![],'headers':{'Host':_0x23d8bd[_0x2ce7('74','2zdN')],'Connection':_0x23d8bd[_0x2ce7('75','5txG')],'Cookie':_0x23d8bd[_0x2ce7('76','HKTT')](_0x23d8bd[_0x2ce7('77','8Pcf')](_0x23d8bd[_0x2ce7('78','246U')](_0x23d8bd[_0x2ce7('79','agRE')](cookie,'\x20'),_0x23d8bd[_0x2ce7('7a','8BWJ')]),_0x3ab39f),';'),'Referer':$[_0x2ce7('7b','ry4R')],'User-Agent':_0x23d8bd[_0x2ce7('7c','OFD3')]}};return new Promise(_0x9ad5b1=>{var _0x35bd10={'GrXXo':function(_0x34de4){return _0x23d8bd[_0x2ce7('7d',')m*A')](_0x34de4);},'iGfeq':function(_0x5c4541,_0xe90c05){return _0x23d8bd[_0x2ce7('7e','(rGE')](_0x5c4541,_0xe90c05);},'jvDBt':_0x23d8bd[_0x2ce7('7f','E1F5')],'pAzjD':_0x23d8bd[_0x2ce7('80','GIz9')],'uHGXj':_0x23d8bd[_0x2ce7('81','OFD3')],'GcHkx':function(_0x48941a,_0xae1d4d){return _0x23d8bd[_0x2ce7('82','E5V3')](_0x48941a,_0xae1d4d);},'zrvwR':function(_0x50c933,_0x1c40d6){return _0x23d8bd[_0x2ce7('83','Tsy1')](_0x50c933,_0x1c40d6);},'HhMGt':function(_0x42b915,_0x36e5cf){return _0x23d8bd[_0x2ce7('84','(rGE')](_0x42b915,_0x36e5cf);},'gdews':function(_0x40f039,_0x5dab11){return _0x23d8bd[_0x2ce7('85','p2V*')](_0x40f039,_0x5dab11);},'ZwCBr':function(_0x5c2fcb,_0x226ddd){return _0x23d8bd[_0x2ce7('86','(rGE')](_0x5c2fcb,_0x226ddd);},'gVfrQ':_0x23d8bd[_0x2ce7('87','ry4R')],'laSst':_0x23d8bd[_0x2ce7('88','GIz9')],'ZVfEQ':_0x23d8bd[_0x2ce7('89','ZQDk')],'ypRGo':_0x23d8bd[_0x2ce7('8a','g@Zq')],'bQIun':function(_0x2b57e3,_0xb51cd9){return _0x23d8bd[_0x2ce7('8b','(rGE')](_0x2b57e3,_0xb51cd9);},'grqaJ':_0x23d8bd[_0x2ce7('8c','HjKE')],'rzNzT':_0x23d8bd[_0x2ce7('8d','nX$z')],'HCgdX':function(_0x28a83b){return _0x23d8bd[_0x2ce7('8e','HjKE')](_0x28a83b);}};if(_0x23d8bd[_0x2ce7('8f','E1F5')](_0x23d8bd[_0x2ce7('90','agRE')],_0x23d8bd[_0x2ce7('91','Kzr1')])){$[_0x2ce7('62','E5V3')]();}else{$[_0x2ce7('92','YOWh')](_0x33d8a7,async(_0x310cd9,_0x16955a,_0x4c2849)=>{var _0x14cf5e={'sfdyn':function(_0x315bd8){return _0x35bd10[_0x2ce7('93','ry4R')](_0x315bd8);}};if(_0x35bd10[_0x2ce7('94','GKSY')](_0x35bd10[_0x2ce7('95','ZQDk')],_0x35bd10[_0x2ce7('96','y2op')])){try{if(_0x310cd9){}else{_0x16955a=_0x16955a[_0x2ce7('97','(rGE')][_0x35bd10[_0x2ce7('98','ZQDk')]];_0x16955a=JSON[_0x2ce7('99','8BWJ')](_0x16955a);let _0x34a63e=_0x16955a[_0x2ce7('9a','UDpO')](/CCC_SE(\S*);/)[0x1];let _0xb7019=_0x16955a[_0x2ce7('9b','g7Pf')](/unpl(\S*);/)[0x1];let _0x34899f=_0x16955a[_0x2ce7('9c','X&Ed')](/unionuuid(\S*);/)[0x1];let _0x38e753=_0x35bd10[_0x2ce7('9d','y2op')](_0x35bd10[_0x2ce7('9e','joM(')](_0x35bd10[_0x2ce7('9f','hjsh')](_0x35bd10[_0x2ce7('a0','SUXH')](_0x35bd10[_0x2ce7('a1','Kzr1')](_0x35bd10[_0x2ce7('a2',')m*A')](_0x35bd10[_0x2ce7('a1','Kzr1')](_0x35bd10[_0x2ce7('a3','OFMG')](_0x35bd10[_0x2ce7('a4','P)RF')](_0x35bd10[_0x2ce7('a5','m7a1')](_0x35bd10[_0x2ce7('a6','(rGE')](_0x35bd10[_0x2ce7('a7','ry4R')](_0x35bd10[_0x2ce7('a8','m7a1')](cookie,'\x20'),_0x35bd10[_0x2ce7('a9','VEvN')]),_0x3ab39f),';\x20'),_0x35bd10[_0x2ce7('aa','E1F5')]),_0x34a63e),';\x20'),_0x35bd10[_0x2ce7('ab','Tsy1')]),_0xb7019),';\x20'),_0x35bd10[_0x2ce7('ac','h@m0')]),_0x34899f),';\x20');await _0x35bd10[_0x2ce7('ad','hjsh')](S03,_0x38e753);await $[_0x2ce7('ae','P)RF')](0xc8);}}catch(_0x3d649c){if(_0x35bd10[_0x2ce7('af',')m*A')](_0x35bd10[_0x2ce7('b0','YOWh')],_0x35bd10[_0x2ce7('b1','246U')])){$[_0x2ce7('b2','g7Pf')]();}else{$[_0x2ce7('b3','YOWh')]();}}finally{_0x35bd10[_0x2ce7('b4','$&Uh')](_0x9ad5b1);}}else{_0x14cf5e[_0x2ce7('b5','rIvr')](_0x9ad5b1);}});}});}function S03(_0x35af7a){var _0x41d826={'MbSOc':function(_0x4570a5,_0x2542fb){return _0x4570a5===_0x2542fb;},'mqDlk':_0x2ce7('b6','YOWh'),'HkuyE':function(_0x3fe7d6,_0x5cc8d9){return _0x3fe7d6(_0x5cc8d9);},'AJyaw':function(_0x433717){return _0x433717();},'xYziV':_0x2ce7('b7','WMDD'),'yvfPI':_0x2ce7('b8','rIvr'),'eZbVM':_0x2ce7('b9','GKSY')};let _0x389515={'url':$[_0x2ce7('ba','g7Pf')],'headers':{'Host':_0x41d826[_0x2ce7('bb','O31X')],'Connection':_0x41d826[_0x2ce7('bc','HKTT')],'Cookie':_0x35af7a,'Referer':$[_0x2ce7('bd',']Dik')],'User-Agent':_0x41d826[_0x2ce7('be','0RcQ')]}};return new Promise(_0x271b75=>{var _0x4db97f={'sOrrk':function(_0x520d67,_0x175f39){return _0x41d826[_0x2ce7('bf','SUXH')](_0x520d67,_0x175f39);},'wTLpx':_0x41d826[_0x2ce7('c0','g@Zq')],'McCBZ':function(_0x77c1f1,_0x1aba09){return _0x41d826[_0x2ce7('c1','Qd&2')](_0x77c1f1,_0x1aba09);},'vHZLO':function(_0x25d167){return _0x41d826[_0x2ce7('c2','OFD3')](_0x25d167);}};$[_0x2ce7('c3','pd^6')](_0x389515,async(_0x145491,_0x3fa2f4,_0x2c84e7)=>{try{if(_0x145491){}else{if(_0x4db97f[_0x2ce7('c4',')m*A')](_0x4db97f[_0x2ce7('c5','8BWJ')],_0x4db97f[_0x2ce7('c6','$JML')])){_0x2c84e7=JSON[_0x2ce7('c7','8Pcf')](_0x2c84e7);await _0x4db97f[_0x2ce7('c8','(rGE')](S04,_0x35af7a);await $[_0x2ce7('c9','rIvr')](0xc8);}else{$[_0x2ce7('ca','rIvr')]();}}}catch(_0x6ef0a8){$[_0x2ce7('b3','YOWh')]();}finally{_0x4db97f[_0x2ce7('cb','i1)!')](_0x271b75);}});});}function S04(_0x3c2c15){var _0x4aa8a2={'ABbmr':function(_0x579c74){return _0x579c74();},'AePhY':_0x2ce7('cc','VEvN'),'DJhlK':_0x2ce7('72','%u^E'),'EuHPd':_0x2ce7('cd','FZPj')};let _0x17a565={'url':$[_0x2ce7('ce','OFMG')],'headers':{'Host':_0x4aa8a2[_0x2ce7('cf','YOWh')],'Connection':_0x4aa8a2[_0x2ce7('d0','$&Uh')],'Cookie':_0x3c2c15,'Referer':$[_0x2ce7('d1','GIz9')],'User-Agent':_0x4aa8a2[_0x2ce7('d2','VEvN')]}};return new Promise(_0x2dda59=>{$[_0x2ce7('4e','GKSY')](_0x17a565,async(_0xb0c84a,_0x17a5f4,_0x4e2b62)=>{try{if(_0xb0c84a){}else{_0x4e2b62=JSON[_0x2ce7('d3','Qd&2')](_0x4e2b62);await $[_0x2ce7('d4','Kzr1')](0xc8);}}catch(_0x170202){$[_0x2ce7('d5','246U')]();}finally{_0x4aa8a2[_0x2ce7('d6','P)RF')](_0x2dda59);}});});};_0xodw='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}