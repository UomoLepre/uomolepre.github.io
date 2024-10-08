"use client";
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { usePathname } from 'next/navigation';

import { alertService, AlertType } from "@/services/alert.service";

export { Alert };

Alert.propTypes = {
    id: PropTypes.string,
    fade: PropTypes.bool
};

function Alert({ id = 'default-alert', fade = true }) {
    const mounted = useRef(false);
    const pathname = usePathname();
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        mounted.current = true;

        const subscription = alertService.onAlert(id).subscribe((alert) => {
            if (!alert.message) {
                setAlerts((alerts) => {
                    const filteredAlerts = alerts.filter(x => x.keepAfterRouteChange);
                    return omit(filteredAlerts, 'keepAfterRouteChange');
                });
            } else {
                alert.itemId = Math.random();
                setAlerts((alerts) => [...alerts, alert]);

                if (alert.autoClose) {
                    setTimeout(() => removeAlert(alert), 3000);
                }
            }
        });

        const clearAlerts = () => alertService.clear(id);
        clearAlerts();

        return () => {
            mounted.current = false;
            subscription.unsubscribe();
        };
    }, [pathname]);

    function omit(arr, key) {
        return arr.map(obj => {
            const { [key]: omitted, ...rest } = obj;
            return rest;
        });
    }

    function removeAlert(alert) {
        if (!mounted.current) return;

        if (fade) {
            setAlerts(alerts => alerts.map(x => x.itemId === alert.itemId ? { ...x, fade: true } : x));
            setTimeout(() => {
                setAlerts(alerts => alerts.filter(x => x.itemId !== alert.itemId));
            }, 250);
        } else {
            setAlerts(alerts => alerts.filter(x => x.itemId !== alert.itemId));
        }
    };

    function cssClasses(alert) {
        if (!alert) return '';

        const classes = ['alert', 'alert-dismissable'];

        const alertTypeClass = {
            [AlertType.Success]: 'alert-success',
            [AlertType.Error]: 'alert-danger',
            [AlertType.Info]: 'alert-info',
            [AlertType.Warning]: 'alert-warning'
        }

        classes.push(alertTypeClass[alert.type]);

        if (alert.fade) {
            classes.push('fade');
        }

        return classes.join(' ');
    }

    if (!alerts.length) return null;

    return (
        <div className="fixed-alert-container">
            {alerts.map((alert, index) => (
                <div key={alert.itemId} className={cssClasses(alert)}>
                    {/* <a className="close" onClick={() => removeAlert(alert)}>&times;</a> */}
                    <span dangerouslySetInnerHTML={{ __html: alert.message }}></span>
                </div>
            ))}
        </div>
    );
}
