import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Card, Badge, SectionHeading, IconButton } from '../../components/ui/Card'
import { Container } from '../../components/Container'
import { SiteHeader } from '../../components/SiteHeader'
import { SiteFooter } from '../../components/SiteFooter'
import { TrustStrip } from '../../components/TrustStrip'

export function UiPage() {
  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <SiteHeader />
      <Container>
        <main style={{ paddingBlock: '48px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px' }}>UI Kit</h1>

          <SectionHeading title="Buttons" />
          <Card style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" size="sm">Primary SM</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="primary" loading>Loading</Button>
          </Card>

          <SectionHeading title="Inputs" />
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <Input placeholder="Input" />
            <Select>
              <option>Option 1</option>
              <option>Option 2</option>
            </Select>
          </Card>

          <SectionHeading title="Cards & Badges" />
          <Card style={{ marginBottom: '24px' }}>
            <Badge>Badge</Badge>
            <p style={{ marginTop: '12px' }}>Card content</p>
          </Card>

          <SectionHeading title="Icon Button" />
          <Card style={{ marginBottom: '24px' }}>
            <IconButton aria-label="Menu">☰</IconButton>
          </Card>
        </main>
      </Container>
      <TrustStrip />
      <SiteFooter />
    </div>
  )
}
