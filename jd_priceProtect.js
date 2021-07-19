/*
update 2021/6/14
京东价格保护：脚本更新地址 https://raw.githubusercontent.com/ZCY01/daily_scripts/main/jd/jd_priceProtect.js
脚本兼容: QuantumultX, Node.js
==========================Quantumultx=========================
[task_local]
# 京东价格保护
5 0 * * * https://raw.githubusercontent.com/ZCY01/daily_scripts/main/jd/jd_priceProtect.js, tag=京东价格保护, img-url=https://raw.githubusercontent.com/ZCY01/img/master/pricev1.png, enabled=true
*/

const $ = new Env('X东价格保护');

const selfDomain = 'https://msitepp-fm.jd.com/';
const unifiedGatewayName = 'https://api.m.jd.com/';

let args = {
    goodFilters: "".split('@')
}

!(async () => {
    await requireConfig()
    if (!$.cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取X东账号一cookie\n直接使用NobyDa的X东签到获取', 'https://bean.m.jd.com/', {
            "open-url": "https://bean.m.jd.com/"
        })
        return
    }
    for (let i = 0; i < $.cookiesArr.length; i++) {
        if ($.cookiesArr[i]) {
            $.cookie = $.cookiesArr[i]
            $.UserName = decodeURIComponent($.cookie.match(/pt_pin=(.+?);/) && $.cookie.match(/pt_pin=(.+?);/)[1])
            $.index = i + 1
            $.isLogin = true
            $.nickName = ''
            await totalBean();
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `X东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/`, {
                    "open-url": "https://bean.m.jd.com/"
                })
                await $.notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `X东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                continue
            }
            console.log(`\n***********开始【X东账号${$.index}】${$.nickName || $.UserName}********\n`);

            $.hasNext = true
            $.refundtotalamount = 0
            $.orderList = new Array()
            $.applyMap = {}

            // TODO
            $.token = ''
            $.feSt = 'f'

            console.log(`💥 获得首页面，解析超参数`)
            await getHyperParams()
            console.log($.HyperParam)

            console.log(`🧾 获取所有价格保护列表，排除附件商品`)
            for (let page = 1; $.hasNext; page++) {
                await getApplyData(page)
            }

            console.log(`🗑 删除不符合订单`)
            let taskList = []
            for (let order of $.orderList) {
                taskList.push(HistoryResultQuery(order))
            }
            await Promise.all(taskList)

            console.log(`📊 ${$.orderList.length}个商品即将申请价格保护！`)
            for (let order of $.orderList) {
                await skuApply(order)
                await $.wait(200)
            }

            for (let i = 1; i <= 30 && Object.keys($.applyMap).length > 0; i++) {
                console.log(`⏳ 获取申请价格保护结果，${30 - i}s...`)
                await $.wait(1000)
                if (i % 5 == 0) {
                    await getApplyResult()
                }
            }

            await showMsg()
        }
    }
})()
    .catch((e) => {
        console.log(`❗️ ${$.name} 运行错误！\n${e}`)
    }).finally(() => $.done())

function requireConfig() {
    return new Promise(resolve => {
        console.log('开始获取配置文件\n')
        $.notify = $.isNode() ? require('./sendNotify') : { sendNotify: async () => { } }
        //获取 Cookies
        $.cookiesArr = []
        if ($.isNode()) {
            //Node.js用户请在jdCookie.js处填写X东ck;
            const jdCookieNode = require('./jdCookie.js');
            Object.keys(jdCookieNode).forEach((item) => {
                if (jdCookieNode[item]) {
                    $.cookiesArr.push(jdCookieNode[item])
                }
            })
            if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
        } else {
            //IOS等用户直接用NobyDa的jd $.cookie
            $.cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
        }
        console.log(`共${$.cookiesArr.length}个X东账号\n`)

        if ($.isNode()) {
            if (process.env.JD_PRICE_PROTECT_GOOD_FILTERS) {
                args.goodFilters = process.env.JD_PRICE_PROTECT_GOOD_FILTERS.split('@')
            }
        }
        else if ($.isQuanX()) {
            if ($.getdata('jdPriceProtectGoodFilters')) {
                args.goodFilters = $.getdata('jdPriceProtectGoodFilters').split('@')
            }
        }

        resolve()
    })
}

const getValueById = function (text, id) {
    try {
        const reg = new RegExp(`id="${id}".*value="(.*?)"`)
        const res = text.match(reg)
        return res[1]
    } catch (e) {
        throw new Error(`getValueById:${id} err`)
    }
}

function getHyperParams() {
    return new Promise((resolve, reject) => {
        const options = {
            "url": 'https://msitepp-fm.jd.com/rest/priceprophone/priceProPhoneMenu',
            "headers": {
                'Host': 'msitepp-fm.jd.com',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Cookie': $.cookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'zh-cn',
                'Referer': 'https://ihelp.jd.com/',
                'Accept-Encoding': 'gzip, deflate, br',
            },
        }
        $.get(options, (err, resp, data) => {
            try {
                if (err) throw new Error(JSON.stringify(err))
                $.HyperParam = {
                    sid_hid: getValueById(data, 'sid_hid'),
                    type_hid: getValueById(data, 'type_hid'),
                    isLoadLastPropriceRecord: getValueById(data, 'isLoadLastPropriceRecord'),
                    isLoadSkuPrice: getValueById(data, 'isLoadSkuPrice'),
                    RefundType_Orderid_Repeater_hid: getValueById(data, 'RefundType_Orderid_Repeater_hid'),
                    isAlertSuccessTip: getValueById(data, 'isAlertSuccessTip'),
                    forcebot: getValueById(data, 'forcebot'),
                    useColorApi: getValueById(data, 'useColorApi'),
                }
            } catch (e) {
                reject(`⚠️ ${arguments.callee.name.toString()} API返回结果解析出错\n${e}\n${JSON.stringify(data)}`)
            } finally {
                resolve();
            }
        })
    })
}

function getApplyData(page) {
    return new Promise((resolve, reject) => {

        $.hasNext = false
        const pageSize = 5
        let paramObj = {};
        paramObj.page = page
        paramObj.pageSize = pageSize
        paramObj.keyWords = ""
        paramObj.sid = $.HyperParam.sid_hid
        paramObj.type = $.HyperParam.type_hid
        paramObj.forcebot = $.HyperParam.forcebot
        paramObj.token = $.token
        paramObj.feSt = $.feSt

        $.post(taskurl('siteppM_priceskusPull', paramObj), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`🚫 ${arguments.callee.name.toString()} API请求失败，请检查网路\n${JSON.stringify(err)}`)
                } else {
                    let pageErrorVal = data.match(/id="pageError_\d+" name="pageError_\d+" value="(.*?)"/)[1]
                    if (pageErrorVal == 'noexception') {
                        let pageDatasSize = eval(data.match(/id="pageSize_\d+" name="pageSize_\d+" value="(.*?)"/)[1])
                        $.hasNext = pageDatasSize >= pageSize

                        let orders = [...data.matchAll(/skuApply\((.*?)\)/g)]
                        let titles = [...data.matchAll(/<p class="name">(.*?)<\/p>/g)]

                        for (let i = 0; i < orders.length; i++) {
                            let info = orders[i][1].split(',')
                            if (info.length != 4) {
                                throw new Error(`价格保护 ${order[1]}.length != 4`)
                            }

                            const item = {
                                orderId: eval(info[0]),
                                skuId: eval(info[1]),
                                sequence: eval(info[2]),
                                orderCategory: eval(info[3]),
                                title: `🛒${titles[i][1].substr(0, 15)}🛒`,
                            }


                            let id = `skuprice_${item.orderId}_${item.skuId}_${item.sequence}`
                            let reg = new RegExp(`${id}.*?isfujian="(.*?)"`)
                            let del = data.match(reg)[1] == 'true' // is fujian

                            args.goodFilters.forEach(name => {
                                if (titles[i][1].indexOf(name) != -1) {
                                    del = true
                                }
                            })

                            if (!del) {
                                let skuRefundTypeDiv_orderId = `skuRefundTypeDiv_${item.orderId}`
                                item['refundtype'] = getValueById(data, skuRefundTypeDiv_orderId)
                                $.orderList.push(item)
                            }
                            else {
                                //尊敬的顾客您好，您选择的商品本身为赠品，是不支持价保的呦，请您理解。
                                console.log(`⏰ 过滤商品：${item.title}`)
                            }
                        }
                    }
                }
            } catch (e) {
                reject(`⚠️ ${arguments.callee.name.toString()} API返回结果解析出错\n${e}\n${JSON.stringify(data)}`)
            } finally {
                resolve();
            }
        })
    })
}

//  申请按钮
// function skuApply(orderId, skuId, sequence, orderCategory, refundtype) {
function skuApply(order) {
    return new Promise((resolve, reject) => {
        let paramObj = {};
        paramObj.orderId = order.orderId;
        paramObj.orderCategory = order.orderCategory;
        paramObj.skuId = order.skuId;
        paramObj.sid = $.HyperParam.sid_hid
        paramObj.type = $.HyperParam.type_hid
        paramObj.refundtype = order.refundtype
        paramObj.forcebot = $.HyperParam.forcebot
        paramObj.token = $.token
        paramObj.feSt = $.feSt

        console.log(`🈸 ${order.title} 正在价格保护...`)
        $.post(taskurl('siteppM_proApply', paramObj), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`🚫 ${arguments.callee.name.toString()} API请求失败，请检查网路\n${JSON.stringify(err)}`)
                } else {
                    data = JSON.parse(data)
                    if (data.flag) {
                        if (data.proSkuApplyId != null) {
                            $.applyMap[data.proSkuApplyId[0]] = order
                        }
                    } else {
                        console.log(`🚫 ${order.title} 申请失败：${data.errorMessage}`)
                    }
                }
            } catch (e) {
                reject(`⚠️ ${arguments.callee.name.toString()} API返回结果解析出错\n${e}\n${JSON.stringify(data)}`)
            } finally {
                resolve();
            }
        })
    })
}

function HistoryResultQuery(order) {
    return new Promise((resolve, reject) => {
        let paramObj = {};
        paramObj.orderId = order.orderId;
        paramObj.skuId = order.skuId;
        paramObj.sequence = order.sequence;
        paramObj.sid = $.HyperParam.sid_hid
        paramObj.type = $.HyperParam.type_hid
        paramObj.pin = undefined
        paramObj.forcebot = $.HyperParam.forcebot

        const reg = new RegExp("overTime|[^库]不支持价保|无法申请价保|请用原订单申请")
        let deleted = true
        $.post(taskurl('siteppM_skuProResultPin', paramObj), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`🚫 ${arguments.callee.name.toString()} API请求失败，请检查网路\n${JSON.stringify(err)}`)
                } else {
                    deleted = reg.test(data)
                }
            } catch (e) {
                reject(`⚠️ ${arguments.callee.name.toString()} API返回结果解析出错\n${e}\n${JSON.stringify(data)}`)
            } finally {
                if (deleted) {
                    console.log(`⏰ 删除商品：${order.title}`)
                    $.orderList = $.orderList.filter(item => {
                        return item.orderId != order.orderId || item.skuId != order.skuId
                    })
                }
                resolve()
            }
        })
    })
}

function getApplyResult() {
    function handleApplyResult(ajaxResultObj) {
        if (ajaxResultObj.hasResult != "undefined" && ajaxResultObj.hasResult == true) { //有结果了
            let proSkuApplyId = ajaxResultObj.applyResultVo.proSkuApplyId; //申请id
            let order = $.applyMap[proSkuApplyId]
            delete $.applyMap[proSkuApplyId]
            if (ajaxResultObj.applyResultVo.proApplyStatus == 'ApplySuccess') { //价保成功
                $.refundtotalamount += ajaxResultObj.applyResultVo.refundtotalamount
                console.log(`📋 ${order.title} \n🟢 申请成功：￥${$.refundtotalamount}`);
            } else {
                console.log(`📋 ${order.title} \n🔴 申请失败：${ajaxResultObj.applyResultVo.failTypeStr} \n🔴 失败类型:${ajaxResultObj.applyResultVo.failType}`);
            }
        }
    }
    return new Promise((resolve, reject) => {
        let proSkuApplyIds = Object.keys($.applyMap).join(",");
        let paramObj = {};
        paramObj.proSkuApplyIds = proSkuApplyIds;
        paramObj.pin = $.HyperParam.pin
        paramObj.type = $.HyperParam.type_hid

        $.post(taskurl('siteppM_moreApplyResult', paramObj), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`🚫 ${arguments.callee.name.toString()} API请求失败，请检查网路\n${JSON.stringify(err)}`)
                } else if (data) {
                    data = JSON.parse(data)
                    let resultArray = data.applyResults;
                    for (let i = 0; i < resultArray.length; i++) {
                        let ajaxResultObj = resultArray[i];
                        handleApplyResult(ajaxResultObj);
                    }
                }
            } catch (e) {
                reject(`⚠️ ${arguments.callee.name.toString()} API返回结果解析出错\n${e}\n${JSON.stringify(data)}`)
            } finally {
                resolve()
            }
        })
    })
}

function taskurl(functionid, body) {
    let urlStr = selfDomain + "rest/priceprophone/priceskusPull"
    if ($.HyperParam.useColorApi == "true") {
        urlStr = unifiedGatewayName + "api?appid=siteppM&functionId=" + functionid + "&forcebot=" + $.HyperParam.forcebot + "&t=" + new Date().getTime()
    }
    return {
        "url": urlStr,
        "headers": {
            'Host': $.HyperParam.useColorApi == 'true' ? 'api.m.jd.com' : 'msitepp-fm.jd.com',
            'Accept': '*/*',
            'Accept-Language': 'zh-cn',
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://msitepp-fm.jd.com',
            'Connection': 'keep-alive',
            'Referer': 'https://msitepp-fm.jd.com/rest/priceprophone/priceProPhoneMenu',
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
            "Cookie": $.cookie
        },
        "body": body ? `body=${JSON.stringify(body)}` : undefined
    }
}

async function showMsg() {
    const message = `X东账号${$.index} ${$.nickName || $.UserName}\n🎉 本次价格保护金额：${$.refundtotalamount}💰`
    console.log(message)
    if ($.refundtotalamount) {
        $.msg($.name, ``, message, {
            "open-url": "https://msitepp-fm.jd.com/rest/priceprophone/priceProPhoneMenu"
        });
        await $.notify.sendNotify($.name, message)
    }
}

function totalBean() {
    return new Promise(async resolve => {
        const options = {
            "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
            "headers": {
                "Accept": "application/json,text/plain, */*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-cn",
                "Connection": "keep-alive",
                "Cookie": $.cookie,
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
                        console.log(`X东服务器返回空数据`)
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

// 来自 @chavyleung 