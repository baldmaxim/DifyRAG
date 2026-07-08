import { CloudServerOutlined } from '@ant-design/icons';
import { Card, Layout, Space, Typography } from 'antd';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

/**
 * Prompt 01 skeleton landing page. The full enterprise UI (login, dashboard,
 * projects, search, integrations, ...) is implemented in prompt 06.
 */
function App(): React.ReactElement {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Space>
          <CloudServerOutlined style={{ color: '#fff', fontSize: 20 }} />
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
            Document Knowledge Portal
          </span>
        </Space>
      </Header>
      <Content style={{ padding: 24, maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <Card>
          <Title level={3}>Document Knowledge Portal</Title>
          <Paragraph type="secondary">
            Dify-first RAG portal for construction-company documents. This is the monorepo
            scaffold (prompt 01); the full interface is built in prompt 06.
          </Paragraph>
        </Card>
      </Content>
    </Layout>
  );
}

export default App;
