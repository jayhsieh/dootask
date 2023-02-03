<template>
    <div class="setting-item submit">
        <Tabs v-model="tabAction">
            <TabPane :label="$L('系統設置')" name="setting">
                <SystemSetting/>
            </TabPane>
            <TabPane :label="$L('任務優先級')" name="taskPriority">
                <SystemTaskPriority/>
            </TabPane>
            <TabPane :label="$L('項目模板')" name="columnTemplate">
                <SystemColumnTemplate/>
            </TabPane>
            <TabPane :label="$L('郵件設置')" name="emailSetting">
                <SystemEmailSetting/>
            </TabPane>
        </Tabs>
    </div>
</template>

<script>
import SystemSetting from "./components/SystemSetting";
import SystemTaskPriority from "./components/SystemTaskPriority";
import SystemColumnTemplate from "./components/SystemColumnTemplate";
import SystemEmailSetting from "./components/SystemEmailSetting";

export default {
    components: {SystemColumnTemplate, SystemTaskPriority, SystemSetting, SystemEmailSetting},
    data() {
        return {
            tabAction: 'setting',
        }
    },
}
</script>
