const debug = require('debug')('srv:catalog-service');

module.exports = cds.service.impl(async function () {

    const NeoWs = await cds.connect.to('NearEarthObjectWebService');
    const xsuaa = await cds.connect.to('xsuaa_api');
    const xsuaa2 = await cds.connect.to('xsuaa_user_mgmt');
    const xsuaa3 = await cds.connect.to('xsuaa_group_mgmt');

    const {
            Sales
            ,
            Asteroids
          } = this.entities;

    this.after('READ', Sales, (each) => {
        if (each.amount > 500) {
            each.criticality = 3;
            if (each.comments === null)
                each.comments = '';
            else
                each.comments += ' ';
            each.comments += 'Exceptional!';
            debug(each.comments, {"country": each.country, "amount": each.amount});
        } else if (each.amount < 150) {
            each.criticality = 1;
        } else {
            each.criticality = 2;
        }
    });

    this.on('boost', async req => {
        try {
            const ID = req.params[0];
            const tx = cds.tx(req);
            await tx.update(Sales)
                .with({ amount: { '+=': 250 }, comments: 'Boosted!' })
                .where({ ID: { '=': ID } })
                ;
            debug('Boosted ID:', ID);
            return {};
        } catch (err) {
            console.error(err);
            return {};
        }
    });


    this.on('topSales', async (req) => {
        try {
            const tx = cds.tx(req);
            const results = await tx.run(`CALL "SA_DEVOPS_APP_DB_SP_TopSales"(?,?)`, [req.data.amount]);
            return results;
        } catch (err) {
            console.error(err);
            return {};
        }
    });











    this.on('READ', Asteroids, async (req) => {
        try {
            const tx = NeoWs.transaction(req);
            return await tx.send({
                query: req.query
            })
        } catch (err) {
            req.reject(err);
        }
    });

    this.on('userInfo', req => {
        let results = {};
        results.user = req.user.id;
        if (req.user.locale) {
            results.locale = req.user.locale;
        }
        results.scopes = {};
        results.scopes.identified = req.user.is('identified-user');
        results.scopes.authenticated = req.user.is('authenticated-user');
        results.scopes.Viewer = req.user.is('Viewer');
        results.scopes.Admin = req.user.is('Admin');
        results.fullinfo = req.user;
        return results;
    });

    this.on('userInfo2', async (req) => {
        console.log(req.user);
        return await xsuaa.get("/");
    });

    this.on('listUsers', async (req) => {
        console.log(req.user);
        return await xsuaa2.get("/"); 
    });

    this.on('listGroups', async (req) => {
        console.log(req.user);
        return await xsuaa3.get("/"); 
    });
});